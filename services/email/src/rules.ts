import { globalRules, marketRules, type MarketRules, type Weekday } from "./market-rules.js";

export type Audience = "b2b" | "b2c";

export interface EmailConsent {
  status: "granted" | "withdrawn" | "expired" | "unknown";
  basis: string;
  captured_at: string;
  /** For implied_casl: what the implied consent comes from. */
  implied_from?: "purchase_or_contract" | "inquiry";
  /** For casl_business_exemption: where the contact published the address. */
  source_url?: string;
}

/**
 * Send-time consent re-check (flow library rule 4). The engine audience resolve is the main check;
 * this runs again just before each send because consent can change while a contact waits in a flow.
 */
export function consentAllows(consent: EmailConsent, market: string, audience: Audience, now: Date): { ok: boolean; reason?: string } {
  if (globalRules.blocked_consent_statuses.includes(consent.status)) return { ok: false, reason: `status ${consent.status}` };
  const rules = marketRules(market);
  const bases = audience === "b2b" ? rules.b2b_bases : rules.b2c_bases;
  if (!bases.includes(consent.basis)) return { ok: false, reason: `basis ${consent.basis} not accepted for ${audience} in ${market}` };
  if (consent.basis === "implied_casl") {
    const days = rules.implied_consent_expiry_days?.[consent.implied_from ?? "inquiry"];
    if (days === undefined) return { ok: false, reason: "implied consent with no expiry rule" };
    const expires = new Date(consent.captured_at).getTime() + days * 86_400_000;
    if (now.getTime() > expires) return { ok: false, reason: "implied consent expired" };
  }
  if (consent.basis === "casl_business_exemption" && !consent.source_url) return { ok: false, reason: "business exemption needs a source URL" };
  return { ok: true };
}

/** Cold B2B outbound is allowed only where the market rules say so (EU is off by default). */
export const coldOutboundAllowed = (market: string) => marketRules(market).cold_outbound_allowed;

/** Footer fields an email to this market must have. The US ad statement applies only when the contact gave no consent. */
export function requiredFooterFields(market: string, opts: { consentGiven: boolean; thirdPartyData?: boolean }): string[] {
  const rules = marketRules(market);
  const fields = [...globalRules.required_footer_fields];
  for (const f of rules.extra_footer_fields ?? []) {
    if (f === "ad_identification_if_no_consent") {
      if (!opts.consentGiven) fields.push("ad_identification");
    } else fields.push(f);
  }
  if (opts.thirdPartyData && rules.group === "EU") fields.push("article_14_notice");
  return fields;
}

export const missingFooterFields = (present: string[], market: string, opts: { consentGiven: boolean; thirdPartyData?: boolean }) =>
  requiredFooterFields(market, opts).filter((f) => !present.includes(f));

/** Adds the Singapore "<ADV> " label to an unsolicited bulk email subject (Spam Control Act). */
export function finalSubject(subject: string, market: string, unsolicitedBulk: boolean): string {
  const prefix = marketRules(market).subject_prefix_unsolicited;
  if (!unsolicitedBulk || !prefix || subject.startsWith(prefix)) return subject;
  return prefix + subject;
}

/** Subject line checks from the QA prompt: no fake reply prefix, no all caps, at most 3 emoji. */
export function subjectProblems(subject: string): string[] {
  const out: string[] = [];
  if (globalRules.ban_fake_reply_prefixes && /^\s*(re|fwd?|aw|wg|tr)\s*:/i.test(subject)) out.push("fake reply or forward prefix");
  const letters = subject.replace(/[^\p{L}]/gu, "");
  if (letters.length >= 6 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) out.push("all caps");
  if ((subject.match(/\p{Extended_Pictographic}/gu) ?? []).length > 3) out.push("more than 3 emoji");
  return out;
}

const DAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** B2B sends go on local work days only. `localDate` is the date in the contact's time zone, as YYYY-MM-DD. */
export function isWorkDay(localDate: string, market: string): boolean {
  const day = DAYS[new Date(`${localDate}T12:00:00Z`).getUTCDay()];
  return !marketRules(market).weekend.includes(day);
}

/** Default local send time before the client has data (playbook §9). In Ramadan, GCC B2C moves to after iftar. */
export function defaultSendTime(market: string, audience: Audience, ramadan = false): string {
  const t = marketRules(market).default_send_time;
  if (audience === "b2c" && ramadan && t.b2c_ramadan) return t.b2c_ramadan;
  return t[audience];
}

/** Frequency cap: marketing emails already sent to the contact today and in the last 7 days (flow emails count). */
export function withinFrequencyCap(sent: { today: number; last7Days: number }, isCampaign: boolean): boolean {
  const cap = globalRules.frequency_cap;
  if (sent.last7Days >= cap.marketing_emails_per_week) return false;
  return !(isCampaign && sent.today >= cap.campaigns_per_day);
}

export interface SendStats {
  delivered: number;
  hard_bounces: number;
  complaints: number;
  unsubscribes: number;
}

export type Level = "ok" | "watch" | "stop";

/** Deliverability level against the targets and stop limits (playbook §7). A stop pauses sends until a person resumes them. */
export function deliverabilityLevel(s: SendStats): { level: Level; over: string[] } {
  if (s.delivered <= 0) return { level: "ok", over: [] };
  const lim = globalRules.deliverability_limits;
  const rates: [string, number, { target: number; stop: number }][] = [
    ["complaint_rate", s.complaints / s.delivered, lim.complaint_rate],
    ["bounce_rate", s.hard_bounces / s.delivered, lim.hard_bounce_rate],
    ["opt_out_rate", s.unsubscribes / s.delivered, lim.unsubscribe_rate],
  ];
  const stop = rates.filter(([, r, l]) => r >= l.stop).map(([k]) => k);
  if (stop.length) return { level: "stop", over: stop };
  const watch = rates.filter(([, r, l]) => r > l.target).map(([k]) => k);
  return { level: watch.length ? "watch" : "ok", over: watch };
}

export interface VariantResult {
  variant: string;
  delivered: number;
  clicks: number;
  revenue: number;
  /** Sum of squared revenue per recipient, for the revenue test. */
  revenue_sq: number;
}

export const MIN_TEST_CELL = 1000;
const Z_95 = 1.959964;

/** Standard normal CDF (Abramowitz and Stegun 7.1.26). */
function phi(z: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/**
 * A/B winner (playbook §8): the first variant is the control. Click rate uses a two-proportion z-test,
 * revenue per recipient a Welch z-test. A challenger wins only at 95% confidence (two-sided) and only with
 * at least 1,000 recipients per cell; otherwise the control stays. Open rate is never used.
 */
export function pickWinner(variants: VariantResult[], metric: "ctr" | "revenue_per_recipient") {
  const [control, ...rest] = variants;
  if (!control || rest.length === 0) throw new Error("A test needs a control and at least 1 challenger");
  const keep = (note: string) => ({ winner_variant: control.variant, metric, lift: 0, confidence: 0, decision: "keep_control" as const, note });
  if (variants.some((v) => v.delivered < MIN_TEST_CELL)) return keep(`a cell has fewer than ${MIN_TEST_CELL} recipients; pool more sends`);

  const stat = (v: VariantResult) => {
    if (metric === "ctr") {
      const p = v.clicks / v.delivered;
      return { mean: p, var: (p * (1 - p)) / v.delivered };
    }
    const mean = v.revenue / v.delivered;
    const variance = Math.max(v.revenue_sq / v.delivered - mean * mean, 0) * (v.delivered / (v.delivered - 1));
    return { mean, var: variance / v.delivered };
  };
  const c = stat(control);
  let best: { v: VariantResult; z: number; lift: number } | undefined;
  for (const v of rest) {
    const s = stat(v);
    const se = Math.sqrt(c.var + s.var);
    if (se === 0) continue;
    const z = (s.mean - c.mean) / se;
    const lift = c.mean === 0 ? 0 : (s.mean - c.mean) / c.mean;
    if (!best || z > best.z) best = { v, z, lift };
  }
  if (!best || best.z < Z_95) return keep("no significant difference");
  const confidence = 1 - 2 * (1 - phi(best.z));
  return { winner_variant: best.v.variant, metric, lift: best.lift, confidence, decision: "winner" as const, note: `z = ${best.z.toFixed(2)}` };
}

export type ReplyClass =
  | "interested" | "meeting_request" | "referral" | "not_now" | "not_interested" | "unsubscribe" | "out_of_office"
  | "wrong_person" | "bounce_or_auto" | "complaint" | "legal" | "press" | "regulator" | "other";

/** Reply routing, same order as the email.reply_triage branch: escalation first (engine G4), then opt-out, then sales. */
export function replyRoute(c: ReplyClass): "escalate" | "optout" | "to_sales" | "log" {
  if (["complaint", "legal", "press", "regulator"].includes(c)) return "escalate";
  if (["unsubscribe", "not_interested"].includes(c)) return "optout";
  if (["interested", "meeting_request", "referral"].includes(c)) return "to_sales";
  return "log";
}

/** Sunset flow entry: no click and no purchase or meeting for 180 days (B2C) or 270 days (B2B). */
export function sunsetDue(lastEngagedAt: Date, audience: Audience, now: Date): boolean {
  const days = audience === "b2b" ? 270 : 180;
  return now.getTime() - lastEngagedAt.getTime() >= days * 86_400_000;
}

/** Re-permission email is allowed only where 1 request email is lawful: not in Canada or the EU without a basis. */
export function repermissionAllowed(market: string): boolean {
  const rules: MarketRules = marketRules(market);
  return rules.group !== "EU" && market.slice(0, 2) !== "CA";
}

/** Required email language for a market, if the law fixes one (Quebec: French). */
export const requiredLanguage = (market: string) => marketRules(market).required_language as string | undefined;
