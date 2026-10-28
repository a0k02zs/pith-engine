export interface DealRegistration {
  registration_id: string;
  partner_id: string;
  company_domain: string;
  registered_at: string;
}

export interface CrmMatch {
  company_domain: string;
  type: "open_opportunity" | "existing_customer";
  record_id: string;
}

export type DealDecision =
  | { registration_id: string; decision: "accept" }
  | { registration_id: string; decision: "conflict"; conflicts: { type: string; record_id: string }[] };

/**
 * B2B deal registration check (Deal Desk). Accept only if the company has no open opportunity, is not a
 * customer, and no other partner registered it inside the protection window. A conflict goes to client sales.
 */
export function checkRegistration(
  reg: DealRegistration,
  crm: CrmMatch[],
  earlier: DealRegistration[],
  protectionDays: number,
): DealDecision {
  const domain = reg.company_domain.toLowerCase();
  const conflicts: { type: string; record_id: string }[] = crm
    .filter((m) => m.company_domain.toLowerCase() === domain)
    .map((m) => ({ type: m.type, record_id: m.record_id }));
  const since = new Date(reg.registered_at).getTime() - protectionDays * 86_400_000;
  for (const e of earlier) {
    if (e.registration_id === reg.registration_id || e.partner_id === reg.partner_id) continue;
    const t = new Date(e.registered_at).getTime();
    if (e.company_domain.toLowerCase() === domain && t >= since && t <= new Date(reg.registered_at).getTime()) {
      conflicts.push({ type: "other_partner", record_id: e.registration_id });
    }
  }
  return conflicts.length ? { registration_id: reg.registration_id, decision: "conflict", conflicts } : { registration_id: reg.registration_id, decision: "accept" };
}
