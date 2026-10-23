/**
 * Attribution models for service 12. The same rules as sql/fct_attribution.sql, in code, so the
 * models can be tested and run outside the warehouse. Model codes come from enums.attribution_models.
 */

export type RuleModel = "last_touch" | "last_non_direct" | "first_touch" | "linear" | "time_decay" | "position_based";
export type AttributionModel = RuleModel | "data_driven" | "b2b_account";

export interface Touchpoint {
  id: string | number;
  channel: string;
  /** ISO 8601 date-time */
  occurredAt: string;
}

export interface Conversion {
  id: string;
  /** ISO 8601 date-time */
  convertedAt: string;
  value: number;
  touchpoints: Touchpoint[];
}

export interface Credit {
  conversionId: string;
  touchpointId: string | number;
  channel: string;
  model: AttributionModel;
  credit: number;
}

export const DIRECT = "direct";
export const DAY_MS = 86_400_000;
/** playbook.md §5: 30 days B2C, 90 days B2B, 180 days B2B enterprise. */
export const LOOKBACK_DAYS = { b2c: 30, b2b: 90, b2b_enterprise: 180 } as const;
export const TIME_DECAY_HALF_LIFE_DAYS = 7;
/** Below this many conversions in 30 days the Markov model is too noisy (playbook.md §5). */
export const DATA_DRIVEN_MIN_CONVERSIONS = 300;

/** Touches inside the lookback window, oldest first (ties by id, as in the SQL). */
export function pathInWindow(c: Conversion, lookbackDays: number): Touchpoint[] {
  const end = Date.parse(c.convertedAt);
  const start = end - lookbackDays * DAY_MS;
  return c.touchpoints
    .filter((t) => {
      const at = Date.parse(t.occurredAt);
      return at <= end && at >= start;
    })
    .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
}

/** Credit weights for one path; they sum to 1 (or the path is empty). */
export function ruleWeights(path: Touchpoint[], model: RuleModel, convertedAt: string): number[] {
  const n = path.length;
  if (n === 0) return [];
  switch (model) {
    case "first_touch":
      return path.map((_, i) => (i === 0 ? 1 : 0));
    case "last_touch":
      return path.map((_, i) => (i === n - 1 ? 1 : 0));
    case "last_non_direct": {
      let k = -1;
      for (let i = n - 1; i >= 0; i--) if (path[i].channel !== DIRECT) { k = i; break; }
      if (k === -1) k = n - 1; // only direct touches: credit the last one
      return path.map((_, i) => (i === k ? 1 : 0));
    }
    case "linear":
      return path.map(() => 1 / n);
    case "position_based":
      if (n === 1) return [1];
      if (n === 2) return [0.5, 0.5];
      return path.map((_, i) => (i === 0 || i === n - 1 ? 0.4 : 0.2 / (n - 2)));
    case "time_decay": {
      const end = Date.parse(convertedAt);
      const w = path.map((t) => 0.5 ** ((end - Date.parse(t.occurredAt)) / DAY_MS / TIME_DECAY_HALF_LIFE_DAYS));
      const sum = w.reduce((a, b) => a + b, 0);
      return w.map((x) => x / sum);
    }
  }
}

/** Rule-based credits for many conversions. Conversions with no touch in the window get no rows. */
export function attribute(conversions: Conversion[], model: RuleModel, lookbackDays: number): Credit[] {
  const out: Credit[] = [];
  for (const c of conversions) {
    const path = pathInWindow(c, lookbackDays);
    const w = ruleWeights(path, model, c.convertedAt);
    path.forEach((t, i) => {
      if (w[i] > 0) out.push({ conversionId: c.id, touchpointId: t.id, channel: t.channel, model, credit: w[i] });
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Data-driven model: first-order Markov chain, removal effect (model code data_driven)
// ---------------------------------------------------------------------------

const START = "(start)";
const CONV = "(conversion)";
const NULL = "(null)";

export interface Path {
  channels: string[];
  converted: boolean;
}

type Transitions = Map<string, Map<string, number>>;

export function transitionProbabilities(paths: Path[]): Transitions {
  const counts: Transitions = new Map();
  for (const p of paths) {
    const states = [START, ...p.channels, p.converted ? CONV : NULL];
    for (let i = 0; i < states.length - 1; i++) {
      const from = counts.get(states[i]) ?? new Map<string, number>();
      from.set(states[i + 1], (from.get(states[i + 1]) ?? 0) + 1);
      counts.set(states[i], from);
    }
  }
  for (const next of counts.values()) {
    const total = [...next.values()].reduce((a, b) => a + b, 0);
    for (const [k, v] of next) next.set(k, v / total);
  }
  return counts;
}

/** Probability of reaching a conversion from the start. A removed channel sends its traffic to null. */
export function conversionProbability(probs: Transitions, removed?: string, iterations = 200): number {
  const p = new Map<string, number>([[CONV, 1], [NULL, 0]]);
  for (let it = 0; it < iterations; it++) {
    for (const [state, next] of probs) {
      if (state === removed) { p.set(state, 0); continue; }
      let v = 0;
      for (const [to, q] of next) v += q * (to === removed ? 0 : p.get(to) ?? 0);
      p.set(state, v);
    }
  }
  return p.get(START) ?? 0;
}

/** Share of conversions each channel earns by removal effect. Shares sum to 1 (or are all 0). */
export function removalEffectShares(paths: Path[]): Record<string, number> {
  const probs = transitionProbabilities(paths);
  const base = conversionProbability(probs);
  const channels = [...new Set(paths.flatMap((p) => p.channels))].sort();
  const effects = Object.fromEntries(
    channels.map((c) => [c, base === 0 ? 0 : Math.max(0, 1 - conversionProbability(probs, c) / base)]),
  );
  const total = Object.values(effects).reduce((a, b) => a + b, 0);
  return Object.fromEntries(channels.map((c) => [c, total === 0 ? 0 : effects[c] / total]));
}

/**
 * Data-driven credits: each converting path splits its credit across its channels in proportion to the
 * channels' removal-effect shares, then evenly across that channel's touches in the path.
 * `nonConverting` are paths with touches and no conversion in the window.
 */
export function attributeDataDriven(conversions: Conversion[], nonConverting: Path[], lookbackDays: number): Credit[] {
  const converting = conversions.map((c) => ({ c, path: pathInWindow(c, lookbackDays) })).filter((x) => x.path.length > 0);
  const shares = removalEffectShares([
    ...converting.map((x) => ({ channels: x.path.map((t) => t.channel), converted: true })),
    ...nonConverting,
  ]);
  const out: Credit[] = [];
  for (const { c, path } of converting) {
    const channels = [...new Set(path.map((t) => t.channel))];
    const sum = channels.reduce((a, ch) => a + (shares[ch] ?? 0), 0);
    for (const t of path) {
      const touchesOfChannel = path.filter((u) => u.channel === t.channel).length;
      const channelShare = sum === 0 ? 1 / channels.length : (shares[t.channel] ?? 0) / sum;
      const credit = channelShare / touchesOfChannel;
      if (credit > 0) out.push({ conversionId: c.id, touchpointId: t.id, channel: t.channel, model: "data_driven", credit });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Summary by channel
// ---------------------------------------------------------------------------

export interface ChannelSummary {
  channel: string;
  conversions: number;
  revenue: number;
  spend: number | null;
  roas: number | null;
}

export const UNATTRIBUTED = "unattributed";

/** Attributed conversions and revenue by channel. Revenue is split by credit, so it is counted once. */
export function summarize(conversions: Conversion[], credits: Credit[], spendByChannel: Record<string, number> = {}): ChannelSummary[] {
  const value = new Map(conversions.map((c) => [c.id, c.value]));
  const rows = new Map<string, { conversions: number; revenue: number }>();
  const credited = new Set<string>();
  for (const k of credits) {
    credited.add(k.conversionId);
    const r = rows.get(k.channel) ?? { conversions: 0, revenue: 0 };
    r.conversions += k.credit;
    r.revenue += k.credit * (value.get(k.conversionId) ?? 0);
    rows.set(k.channel, r);
  }
  const missing = conversions.filter((c) => !credited.has(c.id));
  if (missing.length) {
    rows.set(UNATTRIBUTED, { conversions: missing.length, revenue: missing.reduce((a, c) => a + c.value, 0) });
  }
  return [...rows.entries()]
    .map(([channel, r]) => {
      const spend = spendByChannel[channel] ?? null;
      return { channel, ...r, spend, roas: spend ? r.revenue / spend : null };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

/** Sum of platform-reported conversions ÷ warehouse conversions (KPI platform_claim_ratio). */
export function platformClaimRatio(platformConversions: Record<string, number>, warehouseConversions: number): number | null {
  if (warehouseConversions <= 0) return null;
  return Object.values(platformConversions).reduce((a, b) => a + b, 0) / warehouseConversions;
}
