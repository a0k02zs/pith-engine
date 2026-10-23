import { readFileSync } from "node:fs";
import { dir } from "./paths.js";
import { marketGroup, marketRules } from "./market-rules.js";

export type Outcome = "pass" | "warn" | "block";

export interface OverlayRule {
  id: string;
  channels: string[];
  markets: "*" | string[];
  severity: "warn" | "block";
  message: string;
  when?: string;
}

export const overlay = JSON.parse(readFileSync(dir("config", "compliance-overlay.json"), "utf8")) as { service: "pr"; rules: OverlayRule[] };

export interface OverlayItem {
  channel: string;
  /** ISO country or subdivision, for example GB, CA-QC, AE. */
  market: string;
  body: string;
  language: string;
  client: { is_listed: boolean; legal_approved: boolean };
  price_sensitive: boolean;
  sender: { name?: string; company?: string; postal_address?: string };
  recipient_basis?: string;
  claim_ids: string[];
  approved_claim_ids: string[];
  sensitive_topics: string[];
  editor_name?: string;
  last_pitched_days_ago?: number | null;
}

export interface Finding {
  rule_id: string;
  severity: "warn" | "block";
  message: string;
}

const OPTOUT = /(reply ["“]?no more["”]?|unsubscribe|opt[ -]?out|not contact you again)/i;
const CASL_BASES = ["casl_business_exemption", "express_casl", "implied_casl"];

function applies(rule: OverlayRule, item: OverlayItem): boolean {
  if (!rule.channels.includes(item.channel)) return false;
  if (rule.markets === "*") return true;
  return rule.markets.some((m) => m === item.market || m === item.market.slice(0, 2) || m === marketGroup(item.market));
}

const CHECKS: Record<string, (i: OverlayItem) => boolean> = {
  "PR-OPTOUT-LINE": (i) => OPTOUT.test(i.body),
  "PR-SENDER-IDENTITY": (i) => !!i.sender.name && !!i.sender.company && (!marketRules(i.market).postal_address || !!i.sender.postal_address),
  "PR-LISTED-LEGAL": (i) => !(i.client.is_listed && i.price_sensitive) || i.client.legal_approved,
  "PR-CASL-BASIS": (i) => !!i.recipient_basis && CASL_BASES.includes(i.recipient_basis),
  "PR-QC-FRENCH": (i) => i.market !== "CA-QC" || i.language.startsWith("fr"),
  "PR-SENSITIVE-TOPIC": (i) => !i.sensitive_topics.some((t) => marketRules(i.market).sensitive_topics.includes(t)) || i.client.legal_approved,
  "PR-AI-EDITOR-NAMED": (i) => !!i.editor_name?.trim(),
  "PR-UNAPPROVED-CLAIM": (i) => i.claim_ids.every((c) => i.approved_claim_ids.includes(c)),
  "PR-RECENTLY-PITCHED": (i) => i.last_pitched_days_ago == null || i.last_pitched_days_ago >= 14,
};

/** Local pre-check with the same rules the engine gate merges for service pr. The engine result is the record of truth. */
export function checkOverlay(item: OverlayItem): { outcome: Outcome; findings: Finding[] } {
  const findings: Finding[] = [];
  for (const rule of overlay.rules) {
    if (!applies(rule, item)) continue;
    const check = CHECKS[rule.id];
    if (!check) throw new Error(`No check for overlay rule ${rule.id}`);
    if (!check(item)) findings.push({ rule_id: rule.id, severity: rule.severity, message: rule.message });
  }
  const outcome: Outcome = findings.some((f) => f.severity === "block") ? "block" : findings.length ? "warn" : "pass";
  return { outcome, findings };
}

export const implementedRuleIds = () => Object.keys(CHECKS);
