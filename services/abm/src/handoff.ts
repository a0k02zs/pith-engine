import { DEFAULT_THRESHOLDS, engagedContacts, engagementScore, intentScore, isSalesReady, type EngagementSignal, type IntentSignal, type Thresholds } from "./scoring.js";

export interface AccountState {
  account_id: string;
  intentSignals: IntentSignal[];
  engagementSignals: EngagementSignal[];
  /** An open opportunity stops ABM plays and hand-offs (docs/pipeline.md §3 rule 8). */
  openOpportunity: boolean;
  /** A hand-off is already waiting at gate G5. */
  handoffPending: boolean;
}

export interface HandoffCheck {
  ready: boolean;
  intent: number;
  engagement: number;
  engagedContacts14d: number;
  reasons: string[];
}

/** Decides whether to emit svc.abm/account.sales_ready for an account. */
export function handoffCheck(a: AccountState, now: Date, t: Thresholds = DEFAULT_THRESHOLDS): HandoffCheck {
  const intent = intentScore(a.intentSignals, now);
  const engagement = engagementScore(a.engagementSignals, now);
  const engaged = engagedContacts(a.engagementSignals, now, 14);
  const reasons: string[] = [];
  if (a.openOpportunity) reasons.push("opportunity already open");
  if (a.handoffPending) reasons.push("hand-off already waiting at G5");
  if (intent < t.handoff_intent) reasons.push(`intent ${intent} < ${t.handoff_intent}`);
  if (engagement < t.handoff_engagement) reasons.push(`engagement ${engagement} < ${t.handoff_engagement}`);
  if (engaged < t.handoff_contacts) reasons.push(`${engaged} engaged contacts < ${t.handoff_contacts}`);
  const ready = !a.openOpportunity && !a.handoffPending && isSalesReady({ intent, engagement, engagedContacts14d: engaged }, t);
  return { ready, intent, engagement, engagedContacts14d: engaged, reasons };
}
