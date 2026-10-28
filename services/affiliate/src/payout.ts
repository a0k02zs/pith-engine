import { programmeRules } from "./config.js";
import type { FraudResult } from "./fraud.js";

export interface PartnerPayoutProfile {
  party_id: string;
  currency: string;
  tax_form_on_file: boolean;
  payout_method_on_file: boolean;
  /** Net balance below the minimum, carried from earlier periods. */
  carried_forward: number;
  statement_url?: string;
}

export interface PayableConversion {
  result: FraudResult;
  /** True once the lock period (returns window) has passed. */
  lock_passed: boolean;
  /** True when a person approved a held conversion at the review gate. */
  hold_approved?: boolean;
}

export interface PayoutLine {
  party_id: string;
  currency: string;
  conversions: number;
  gross: number;
  reversals: number;
  carried_forward: number;
  net: number;
}

export interface PayoutFile {
  period: string;
  lines: PayoutLine[];
  blocked: { party_id: string; reason: string; net: number }[];
  carried: { party_id: string; net: number }[];
  totals_by_currency: Record<string, number>;
  total_reporting: number;
  within_cap: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Builds the monthly payout file for approval (workflow affiliate.payout_monthly, template T8).
 * It never pays: the pay step runs only after the payout gate. `fx` converts 1 unit of a currency to GBP.
 */
export function buildPayout(
  period: string,
  items: PayableConversion[],
  profiles: PartnerPayoutProfile[],
  fx: Record<string, number>,
  budgetCapGbp: number,
): PayoutFile {
  const byParty = new Map<string, PayoutLine>();
  for (const it of items) {
    const r = it.result;
    const payable = (r.decision === "approve" || (r.decision === "hold" && it.hold_approved)) && it.lock_passed;
    if (!payable && r.decision !== "reverse") continue;
    const line = byParty.get(r.partner_id) ?? { party_id: r.partner_id, currency: r.currency, conversions: 0, gross: 0, reversals: 0, carried_forward: 0, net: 0 };
    if (line.currency !== r.currency) throw new Error(`Partner ${r.partner_id} has conversions in ${line.currency} and ${r.currency}`);
    if (r.decision === "reverse") line.reversals += r.amount;
    else {
      line.gross += r.amount;
      line.conversions += 1;
    }
    byParty.set(r.partner_id, line);
  }

  const pr = programmeRules.payout;
  const out: PayoutFile = { period, lines: [], blocked: [], carried: [], totals_by_currency: {}, total_reporting: 0, within_cap: true };
  for (const line of [...byParty.values()].sort((a, b) => a.party_id.localeCompare(b.party_id))) {
    const profile = profiles.find((p) => p.party_id === line.party_id);
    line.carried_forward = profile?.carried_forward ?? 0;
    line.net = round2(line.gross - line.reversals + line.carried_forward);
    line.gross = round2(line.gross);
    line.reversals = round2(line.reversals);
    const rate = fx[line.currency];
    if (rate === undefined) throw new Error(`No FX rate for ${line.currency}`);
    if (!profile) out.blocked.push({ party_id: line.party_id, reason: "no payout profile", net: line.net });
    else if (pr.require_tax_form && !profile.tax_form_on_file) out.blocked.push({ party_id: line.party_id, reason: "tax form missing", net: line.net });
    else if (pr.require_payout_method && !profile.payout_method_on_file) out.blocked.push({ party_id: line.party_id, reason: "payout method missing", net: line.net });
    else if (line.net * rate < pr.min_payout_gbp) out.carried.push({ party_id: line.party_id, net: line.net });
    else {
      out.lines.push(line);
      out.totals_by_currency[line.currency] = round2((out.totals_by_currency[line.currency] ?? 0) + line.net);
      out.total_reporting += line.net * rate;
    }
  }
  out.total_reporting = round2(out.total_reporting);
  out.within_cap = out.total_reporting <= budgetCapGbp;
  return out;
}

/** The engine payout batch payload for the approval inbox (approval-item.json, kind payout). */
export function payoutApprovalDetail(file: PayoutFile, statementUrl: (partyId: string) => string) {
  return {
    lines: file.lines.map((l) => ({ party_id: l.party_id, amount: l.net, currency: l.currency, period: file.period, proof_url: statementUrl(l.party_id) })),
    totals_by_currency: file.totals_by_currency,
  };
}

/** reversal_rate KPI: reversed commission ÷ all commission, in the reporting currency. */
export function reversalRate(results: FraudResult[]): number {
  const total = results.reduce((s, r) => s + r.amount_gbp, 0);
  const reversed = results.filter((r) => r.decision === "reverse").reduce((s, r) => s + r.amount_gbp, 0);
  return total > 0 ? reversed / total : 0;
}
