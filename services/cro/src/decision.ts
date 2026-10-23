import { compare, DEFAULTS, srm, type Arm, type Comparison, type SrmResult } from "./stats.js";

/** Guardrails stop a test when they are worse at this level (docs/01-playbook.md 5.3). */
export const GUARDRAIL_ALPHA = 0.01;
/** Stop when the variant's page error rate is this many times the control's. */
export const ERROR_RATE_STOP_RATIO = 2;

export interface GuardrailInput {
  /** KPI code, for example "cro.sql_rate" or "revenue_per_visitor". */
  metric: string;
  control: Arm;
  /** Variant arms, in the same order as the primary metric's variants. */
  variants: Arm[];
  /** True when a higher value is good (conversion rates); false for refunds, errors, bounces. */
  higherIsBetter: boolean;
}

export interface GuardrailStatus {
  metric: string;
  variant: string;
  status: "ok" | "harmed" | "improved";
  p_value: number;
}

export function guardrailStatus(g: GuardrailInput, alpha: number = GUARDRAIL_ALPHA): GuardrailStatus[] {
  return compare(g.control, g.variants, alpha).map((c) => {
    const good = g.higherIsBetter ? c.direction === "better" : c.direction === "worse";
    const bad = g.higherIsBetter ? c.direction === "worse" : c.direction === "better";
    return { metric: g.metric, variant: c.name, status: bad ? "harmed" : good ? "improved" : "ok", p_value: c.p_value };
  });
}

export interface DailyCheckInput {
  arms: number[];
  weights?: number[];
  guardrails: GuardrailInput[];
  /** Page errors per visitor, control first, then variants. */
  errorRates?: number[];
}

export interface DailyCheck {
  stop: boolean;
  reasons: ("srm" | "guardrail" | "errors")[];
  srm: SrmResult;
  guardrails: GuardrailStatus[];
}

/**
 * The daily check run by cro.test_monitor. A stop pauses the test (risk remove, engine G10),
 * which returns all traffic to the approved control, then opens an escalation.
 */
export function dailyCheck(input: DailyCheckInput): DailyCheck {
  const ratio = srm(input.arms, input.weights);
  const guardrails = input.guardrails.flatMap((g) => guardrailStatus(g));
  const reasons: DailyCheck["reasons"] = [];
  if (ratio.srm_detected) reasons.push("srm");
  if (guardrails.some((g) => g.status === "harmed")) reasons.push("guardrail");
  const [controlErrors, ...variantErrors] = input.errorRates ?? [];
  if (controlErrors !== undefined && variantErrors.some((e) => e >= ERROR_RATE_STOP_RATIO * Math.max(controlErrors, 1e-9))) {
    reasons.push("errors");
  }
  return { stop: reasons.length > 0, reasons, srm: ratio, guardrails };
}

export type Decision = "ship" | "reject" | "inconclusive" | "invalid" | "hold" | "not_ready";

export interface DecideInput {
  control: Arm;
  variants: Arm[];
  /** Planned visitors per arm from the test plan. */
  plannedSamplePerArm: number;
  guardrails?: GuardrailInput[];
  weights?: number[];
  trackingOk?: boolean;
  alpha?: number;
}

export interface DecisionReport {
  decision: Decision;
  /** The variant to ship, when the decision is ship. */
  winner: string | null;
  reason: string;
  srm: SrmResult;
  primary: Comparison[];
  guardrails: GuardrailStatus[];
}

/** Decision rules from docs/01-playbook.md section 5.4. The CRO lead still approves a ship at gate G4. */
export function decide(input: DecideInput): DecisionReport {
  const ratio = srm([input.control.n, ...input.variants.map((v) => v.n)], input.weights);
  const primary = compare(input.control, input.variants, input.alpha ?? DEFAULTS.alpha);
  const guardrails = (input.guardrails ?? []).flatMap((g) => guardrailStatus(g));
  const base = { srm: ratio, primary, guardrails };

  if (input.trackingOk === false) return { ...base, decision: "invalid", winner: null, reason: "Tracking was broken during the test." };
  if (ratio.srm_detected) return { ...base, decision: "invalid", winner: null, reason: `Sample ratio mismatch (p = ${ratio.p_value.toExponential(2)}).` };
  const reached = [input.control, ...input.variants].every((a) => a.n >= input.plannedSamplePerArm);
  if (!reached) return { ...base, decision: "not_ready", winner: null, reason: "The planned sample is not reached. Do not read the primary result yet." };

  const harmed = (name: string) => guardrails.some((g) => g.variant === name && g.status === "harmed");
  const better = primary.filter((c) => c.direction === "better").sort((x, y) => y.lift_relative - x.lift_relative);
  const clean = better.filter((c) => !harmed(c.name));
  if (clean.length > 0) {
    const w = clean[0];
    return { ...base, decision: "ship", winner: w.name, reason: `${w.name} lifts the primary metric by ${(w.lift_relative * 100).toFixed(1)}% with no guardrail harmed.` };
  }
  if (better.length > 0) {
    return { ...base, decision: "hold", winner: null, reason: `${better[0].name} is better on the primary metric but harms a guardrail. The CRO lead and the client decide.` };
  }
  if (primary.every((c) => c.direction === "worse")) {
    return { ...base, decision: "reject", winner: null, reason: "Every variant is worse than the control." };
  }
  return { ...base, decision: "inconclusive", winner: null, reason: "No significant difference at the planned sample. Keep the control." };
}
