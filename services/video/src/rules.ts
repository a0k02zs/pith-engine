import { globalRules, marketRules, type ConsentUse } from "./market-rules.js";

export type Track = "A" | "B" | "C";
export type Format = "short_form" | "ad_variants" | "explainer" | "demo" | "testimonial" | "executive" | "hero" | "event_clips";

// ---------- Track choice (docs/01-playbook.md, "Track choice rule") ----------

export interface TrackInput {
  format: Format;
  segment: "b2b" | "b2c";
  real_person_on_camera: boolean;
  paid_social: boolean;
  needs_authentic_voice: boolean;
  /** True when the job only adapts or resizes an existing approved video. */
  localization_only?: boolean;
  budget?: number;
  track_c_floor?: number;
}

/** Applies the playbook track rule in order. A person can still override the result. */
export function chooseTrack(job: TrackInput): { track: Track; reason: string } {
  const underFloor = job.budget !== undefined && job.track_c_floor !== undefined && job.budget < job.track_c_floor;
  if (job.localization_only) return { track: "A", reason: "Localization of an existing video" };
  if (job.real_person_on_camera || job.format === "hero" || job.format === "testimonial") {
    if (underFloor) {
      return job.segment === "b2c" && job.paid_social
        ? { track: "B", reason: "Budget is under the Track C floor; creator UGC instead of a shoot" }
        : { track: "A", reason: "Budget is under the Track C floor; AI-made instead of a shoot" };
    }
    return { track: "C", reason: job.real_person_on_camera ? "A real customer or employee speaks on camera" : "Hero or testimonial film" };
  }
  if (job.segment === "b2c" && job.paid_social && job.needs_authentic_voice) return { track: "B", reason: "Paid social B2C that needs an authentic voice" };
  return { track: "A", reason: "Volume variants, explainer or demo" };
}

// ---------- Spend gate (G2) ----------

export interface PlanCost {
  track: Track;
  total: number;
  lines: { item: string; amount: number; new_fee?: boolean }[];
}

/** G2 opens when the cost is above the per-job limit, the track is C, or any line is a new fee. */
export function needsSpendGate(plan: PlanCost, perJobLimit: number): boolean {
  return plan.track === "C" || plan.total > perJobLimit || plan.lines.some((l) => l.new_fee === true);
}

// ---------- Rights (engine guardrail G8) ----------

export interface Grant {
  id: string;
  party_id?: string | null;
  contact_id?: string | null;
  scope: string[];
  markets: string[];
  starts_at: string;
  expires_at?: string | null;
  revoked_at?: string | null;
  voice_languages?: string[];
}

export interface Person {
  party_id?: string | null;
  contact_id?: string | null;
  uses: ConsentUse[];
  voice_language?: string;
}

export interface RightsGap {
  person: string;
  market: string;
  missing_scopes: string[];
}

export function grantActive(g: Grant, on: Date): boolean {
  const t = on.getTime();
  if (g.revoked_at && Date.parse(g.revoked_at) <= t) return false;
  if (Date.parse(g.starts_at) > t) return false;
  return !g.expires_at || Date.parse(g.expires_at) > t;
}

/**
 * For each person, market and use: the scopes no active grant covers.
 * Grants hold ISO countries, so CA-QC is checked against CA. A voice clone also needs the dub language.
 */
export function rightsGaps(people: Person[], grants: Grant[], markets: string[], on: Date): RightsGap[] {
  const gaps: RightsGap[] = [];
  for (const p of people) {
    const who = p.party_id ?? p.contact_id;
    if (!who) throw new Error("A person needs a party_id or a contact_id");
    const own = grants.filter((g) => (g.party_id ?? g.contact_id) === who && grantActive(g, on));
    for (const market of markets) {
      const country = market.slice(0, 2);
      const here = own.filter((g) => g.markets.includes(country));
      const needed = [...new Set(p.uses.flatMap((u) => globalRules.consent_scopes_for_use[u]))];
      const missing = needed.filter((scope) =>
        !here.some((g) => g.scope.includes(scope) && (scope !== "voice_clone" || !p.voice_language || (g.voice_languages ?? []).includes(p.voice_language))),
      );
      if (missing.length) gaps.push({ person: who, market, missing_scopes: missing });
    }
  }
  return gaps;
}

// ---------- Labels ----------

export interface LabelInput {
  paid: boolean;
  ai_realistic: boolean;
  actor_portrayal?: boolean;
  retouched?: boolean;
  on: Date;
}

/** Labels each market needs on screen (docs/05-market-rules.md, "Labels the qc-checker looks for"). */
export function requiredLabels(markets: string[], v: LabelInput): { market: string; label: string }[] {
  const out: { market: string; label: string }[] = [];
  for (const market of markets) {
    const r = marketRules(market);
    const add = (label: string | undefined) => label && out.push({ market, label });
    if (v.paid) {
      add(r.paid_label);
      add(r.paid_label_en);
    }
    const aiInForce = !r.ai_label_required_from || v.on.getTime() >= Date.parse(r.ai_label_required_from);
    if (v.ai_realistic && aiInForce) {
      add(r.ai_label);
      add(r.ai_label_en);
    }
    if (v.actor_portrayal && r.actor_label_required) add(globalRules.actor_label);
    if (v.retouched) add(r.retouch_label);
  }
  return out;
}

/** Labels from requiredLabels that the export does not carry. */
export function missingLabels(required: { market: string; label: string }[], present: string[]): { market: string; label: string }[] {
  const have = new Set(present.map((l) => l.trim().toLowerCase()));
  return required.filter((r) => !have.has(r.label.toLowerCase()));
}

/** Markets where only a French master is allowed (Quebec, France). */
export function needsFrenchMaster(market: string): boolean {
  return marketRules(market).french_master_required === true;
}

/** True when any job market needs a native reviewer, or a locale is not English. */
export function needsNativeReview(markets: string[], locales: string[]): boolean {
  return locales.some((l) => !l.startsWith("en")) || markets.some((m) => marketRules(m).native_review && locales.some((l) => !l.startsWith("en")));
}

// ---------- Scripts and captions ----------

/** Spoken seconds for a line at the pace for its language (default English pace). */
export function spokenSeconds(text: string, language = "en"): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wps = globalRules.words_per_second[language.slice(0, 2)] ?? globalRules.words_per_second.en;
  return Math.round((words / wps) * 10) / 10;
}

/** Rows where the spoken audio does not fit inside its time slot. */
export function overlongRows(rows: { t_start: number; t_end: number; audio: string }[], language = "en"): number[] {
  return rows.flatMap((r, i) => (spokenSeconds(r.audio, language) > r.t_end - r.t_start ? [i] : []));
}

/** Caption problems for 1 caption block: too many lines or a line that is too long. */
export function captionProblems(block: string): string[] {
  const { max_chars_per_line, max_lines } = globalRules.caption;
  const lines = block.split("\n");
  const problems: string[] = [];
  if (lines.length > max_lines) problems.push(`${lines.length} lines (max ${max_lines})`);
  lines.forEach((l, i) => {
    if ([...l].length > max_chars_per_line) problems.push(`line ${i + 1} has ${[...l].length} characters (max ${max_chars_per_line})`);
  });
  return problems;
}

// ---------- Exports and QC ----------

export interface FileNameParts {
  client: string;
  campaign: string;
  format: string;
  hook_id: string;
  market: string;
  language: string;
  ratio: "9:16" | "1:1" | "4:5" | "16:9";
  duration_s: number;
  version: number;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** {client}_{campaign}_{format}_{hookID}_{market}_{lang}_{ratio}_{len}s_v{n}, lower case. */
export function exportFileName(p: FileNameParts): string {
  if (!Number.isInteger(p.version) || p.version < 1) throw new Error("version starts at 1");
  return [p.client, p.campaign, p.format, p.hook_id, p.market, p.language, p.ratio.replace(":", "x")]
    .map(slug)
    .concat(`${Math.round(p.duration_s)}s`, `v${p.version}`)
    .join("_");
}

export function loudnessOk(lufs: number, target: "social" | "broadcast_eu"): boolean {
  const { tolerance } = globalRules.loudness_lufs;
  return Math.abs(lufs - globalRules.loudness_lufs[target]) <= tolerance;
}

export const captionDriftOk = (drift_s: number) => Math.abs(drift_s) <= globalRules.caption.max_drift_s;

// ---------- KPIs (docs/06-kpis.md) ----------

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

export const hookRate = (views3s: number, impressions: number) => ratio(views3s, impressions);
export const holdRate = (views15s: number, views3s: number) => ratio(views15s, views3s);
export const completionRate = (views100: number, views3s: number) => ratio(views100, views3s);

/** Job cost divided by approved exports, counting each ratio of a cut once. */
export function costPerFinishedVideo(jobCost: number, exports: { cut_id: string; ratio: string }[]): number | null {
  const unique = new Set(exports.map((e) => `${e.cut_id}|${e.ratio}`));
  return ratio(jobCost, unique.size);
}

/** Variants below the minimum sample are not ranked. */
export const rankable = (impressions: number) => impressions >= globalRules.min_impressions_per_variant;

/** Fatigue: hook rate down 25% from its first week, or frequency above 3 in 7 days. */
export function fatigued(v: { hook_rate: number; first_week_hook_rate: number; frequency_7d: number }): boolean {
  const { hook_rate_drop, max_frequency } = globalRules.fatigue;
  const dropped = v.first_week_hook_rate > 0 && v.hook_rate <= v.first_week_hook_rate * (1 - hook_rate_drop);
  return dropped || v.frequency_7d > max_frequency;
}

/** Working days (Mon to Fri, or the market weekend) from brief accepted to G4 approved. */
export function workingDaysBetween(start: Date, end: Date, weekend: number[] = [0, 6]): number {
  let days = 0;
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const stop = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  while (d.getTime() < stop) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (!weekend.includes(d.getUTCDay())) days++;
  }
  return days;
}

export function deliveryOnTime(track: Track, workingDays: number): boolean {
  return workingDays <= globalRules.track_days[track];
}

/** A take-down is overdue when it is not done within the deadline (24 hours). */
export function takedownOverdue(requestedAt: Date, now: Date, doneAt?: Date): boolean {
  const end = (doneAt ?? now).getTime();
  return end - requestedAt.getTime() > globalRules.takedown_deadline_hours * 3_600_000;
}
