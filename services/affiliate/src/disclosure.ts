import { marketRules } from "./market-rules.js";

export interface PartnerContent {
  /** Plain text of the page or post, in reading order. */
  text: string;
  /** Character index of the first tracked link or code in `text`, or -1 if none. */
  first_link_at: number;
  kind: "page" | "social_post" | "video" | "email";
  has_ai_media?: boolean;
}

export interface PartnerParty {
  country: string;
  licences?: { type: string; number: string; market?: string; expires_at?: string }[];
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Index of a label as a whole word ("ad" must not match "read" or "#ad" inside "#adventure"), or -1. */
function labelIndex(lowerText: string, label: string): number {
  const re = new RegExp(`(?<![\\p{L}\\p{N}#])${escape(label.toLocaleLowerCase())}(?![\\p{L}\\p{N}])`, "u");
  return re.exec(lowerText)?.index ?? -1;
}

export type Finding = "no_disclosure" | "weak_disclosure" | "missing_licence" | "ai_label";

/**
 * Checks one partner page or post (workflow affiliate.compliance_and_report, step sweep).
 * A label counts only before the first tracked link; on social posts it must open the post.
 * Market is the audience country (or subdivision such as "CA-QC").
 */
export function disclosureFindings(content: PartnerContent, market: string, party: PartnerParty, now: Date): Finding[] {
  const rules = marketRules(market);
  const out: Finding[] = [];
  if (content.first_link_at >= 0) {
    const lower = content.text.toLocaleLowerCase();
    const positions = rules.disclosure_labels.map((l) => labelIndex(lower, l)).filter((i) => i >= 0);
    const first = positions.length ? Math.min(...positions) : -1;
    if (first < 0) out.push("no_disclosure");
    else if (first > content.first_link_at) out.push("weak_disclosure");
    else if (content.kind === "social_post" && rules.social_label_first && lower.slice(0, first).trim().length > 40) out.push("weak_disclosure");
  }
  if (rules.partner_licence) {
    const ok = (party.licences ?? []).some(
      (l) => l.type === rules.partner_licence && (!l.expires_at || new Date(l.expires_at).getTime() > now.getTime()),
    );
    if (!ok) out.push("missing_licence");
  }
  if (rules.ai_label_required && content.has_ai_media && !/ai[- ]generated|ki-generiert|généré par ia|gegenereerd door ai/i.test(content.text)) {
    out.push("ai_label");
  }
  return out;
}

/** Serious findings go to the removal gate at once; minor ones get a 5-day fix request first. */
export function severity(f: Finding, repeat: boolean): "minor" | "serious" {
  if (repeat) return "serious";
  return f === "missing_licence" ? "serious" : "minor";
}
