import { readFileSync } from "node:fs";
import { MAX_SEGMENTS, segmentInfo } from "./encoding.js";
import { STOP_BUTTON_TEXTS } from "./keywords.js";
import { dir } from "./paths.js";

export type Severity = "fail" | "warn";
export interface Finding {
  rule: string;
  severity: Severity;
  detail: string;
}

export type Category = "compliance" | "utility" | "marketing";

export interface SmsTemplate {
  id: string;
  category: Category;
  language: string;
  text: string;
  flow?: string;
  use?: string;
  note?: string;
}

export interface PushTemplate {
  id: string;
  flow: string;
  category: Exclude<Category, "compliance">;
  title: string;
  body: string;
  deep_link: string;
}

export interface WhatsAppComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  text?: string;
  format?: string;
  example?: { body_text?: string[][]; header_text?: string[]; header_handle?: string[] };
  buttons?: { type: string; text: string; url?: string; example?: string[] }[];
}

export interface WhatsAppTemplate {
  name: string;
  language: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  components: WhatsAppComponent[];
  [key: string]: unknown;
}

/** Typical worst-case values, so the segment count of a template is close to a real send. */
export const SAMPLE_VALUES: Record<string, string> = {
  brand: "Pith Coffee",
  first_name: "Alexandra",
  product: "Linen Shirt",
  offer: "15% off",
  code: "HELLO15",
  expiry: "31 Oct",
  date: "31 Oct",
  time: "14:30",
  order_id: "100045678",
  service: "Haircut",
  location: "12 High St",
  rep_name: "Sam Lee",
  plan: "Pro plan",
  headline: "Weekend sale",
  support_contact: "help@pithcoffee.com",
  item_count: "3",
  price: "£24",
  sku: "LS-001",
  feature: "reports",
  n: "12",
};
const SAMPLE_LINK = "go.pithcoffee.com/a1B2c3";

export const PUBLIC_SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "rebrand.ly", "cutt.ly", "shorturl.at"];

/** Words and variables that make a message promotional. Utility messages must not have them. */
const PROMO_VARIABLES = ["offer", "code", "price", "headline"];
const PROMO_WORDS = /(\bsale\b|\bdiscount|% off|\bdeal\b|\bpromo|\bcoupon|\bfree gift|\bsave \d)/i;
/** Characters that force UCS-2 by accident in Latin text. */
const ACCIDENTAL_UNICODE = ["‘", "’", "“", "”", "–", "—", "…", " "];

const variables = (text: string) => [...text.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/g)].map((m) => m[1]);
const isLinkVar = (v: string) => v === "link" || v.endsWith("_link");

export function fill(text: string, values: Record<string, string> = SAMPLE_VALUES): string {
  return text.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/g, (_, v: string) => (isLinkVar(v) ? SAMPLE_LINK : values[v] ?? "x".repeat(10)));
}

const urls = (text: string) => text.match(/\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/gi) ?? [];
const host = (url: string) => url.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();

/**
 * Check the links of a final message: at most 1 link, and never on a public shortener.
 * When brandedDomains is given, every link must be on 1 of them.
 */
export function checkLinks(text: string, brandedDomains?: string[]): Finding[] {
  const found: Finding[] = [];
  const all = urls(text);
  if (all.length > 1) found.push({ rule: "one_link", severity: "fail", detail: `${all.length} links; use 1` });
  for (const u of all) {
    const h = host(u);
    if (PUBLIC_SHORTENERS.includes(h)) found.push({ rule: "branded_link", severity: "fail", detail: `public shortener ${h}` });
    else if (brandedDomains && !brandedDomains.some((d) => h === d || h.endsWith(`.${d}`))) {
      found.push({ rule: "branded_link", severity: "fail", detail: `${h} is not a branded domain` });
    }
  }
  return found;
}

function promotionFindings(text: string, vars: string[]): Finding[] {
  const promo = vars.filter((v) => PROMO_VARIABLES.includes(v));
  if (promo.length || PROMO_WORDS.test(text)) {
    return [{ rule: "utility_no_promotion", severity: "fail", detail: `promotional content in a utility message: ${promo.join(", ") || text.match(PROMO_WORDS)![0]}` }];
  }
  return [];
}

/** Opt-out words that a template may show. The market words are checked per send by the engine gate. */
const OPTOUT_LINE = /\b(STOP|ARRET|ARRÊT)\b/;

export function checkSmsTemplate(t: SmsTemplate): Finding[] {
  const found: Finding[] = [];
  const vars = variables(t.text);
  if (!t.text.startsWith("{{brand}}")) found.push({ rule: "brand_first", severity: "fail", detail: "SMS must start with {{brand}}" });
  if (t.category === "marketing" && !OPTOUT_LINE.test(t.text)) {
    found.push({ rule: "optout_line", severity: "fail", detail: "marketing SMS needs an opt-out line, for example 'Reply STOP to opt out'" });
  }
  if (vars.filter(isLinkVar).length + urls(t.text.replace(/\{\{[^}]*\}\}/g, "")).length > 1) {
    found.push({ rule: "one_link", severity: "fail", detail: "use 1 link" });
  }
  if (t.category === "utility") found.push(...promotionFindings(t.text, vars));

  const seg = segmentInfo(fill(t.text));
  if (seg.segments > MAX_SEGMENTS) {
    found.push({ rule: "max_segments", severity: t.category === "marketing" ? "fail" : "warn", detail: `${seg.segments} ${seg.encoding} segments` });
  }
  const accidental = seg.unicode_chars.filter((c) => ACCIDENTAL_UNICODE.includes(c));
  if (accidental.length) found.push({ rule: "accidental_unicode", severity: "warn", detail: `characters force UCS-2: ${accidental.join(" ")}` });
  return found;
}

export const PUSH_LIMITS = { title: 40, body: 120 };

export function checkPushTemplate(t: PushTemplate): Finding[] {
  const found: Finding[] = [];
  const title = fill(t.title);
  const body = fill(t.body);
  if ([...title].length > PUSH_LIMITS.title) found.push({ rule: "push_title_length", severity: "fail", detail: `${[...title].length} > ${PUSH_LIMITS.title}` });
  if ([...body].length > PUSH_LIMITS.body) found.push({ rule: "push_body_length", severity: "fail", detail: `${[...body].length} > ${PUSH_LIMITS.body}` });
  if (!/^[a-z][a-z0-9+.-]*:\/\/\S+$/.test(t.deep_link)) found.push({ rule: "deep_link", severity: "fail", detail: "needs 1 deep link to the exact screen" });
  if (t.category === "utility") found.push(...promotionFindings(`${t.title} ${t.body}`, [...variables(t.title), ...variables(t.body)]));
  return found;
}

const WA_NAME = /^[a-z0-9]+(_[a-z0-9]+)*_v\d+$/;

export function checkWhatsAppTemplate(t: WhatsAppTemplate): Finding[] {
  const found: Finding[] = [];
  if (!WA_NAME.test(t.name)) found.push({ rule: "wa_name", severity: "fail", detail: `name ${t.name} must be lowercase with underscores and end in _v<n>` });
  const body = t.components.find((c) => c.type === "BODY");
  if (!body?.text) return [...found, { rule: "wa_body", severity: "fail", detail: "no BODY text" }];
  if (body.text.length > 1024) found.push({ rule: "wa_body", severity: "fail", detail: "BODY is longer than 1024 characters" });

  const positions = [...body.text.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
  const expected = [...new Set(positions)].sort((a, b) => a - b);
  if (expected.some((n, i) => n !== i + 1)) found.push({ rule: "wa_variables", severity: "fail", detail: "variables must be {{1}}, {{2}}, ... in order" });
  const examples = body.example?.body_text?.[0] ?? [];
  if (examples.length !== expected.length) {
    found.push({ rule: "wa_examples", severity: "fail", detail: `${expected.length} variables but ${examples.length} examples` });
  }

  const footer = t.components.find((c) => c.type === "FOOTER");
  if (footer?.text && footer.text.length > 60) found.push({ rule: "wa_footer", severity: "fail", detail: "FOOTER is longer than 60 characters" });

  const buttons = t.components.find((c) => c.type === "BUTTONS")?.buttons ?? [];
  for (const b of buttons.filter((b) => b.type === "URL")) {
    if (b.url?.includes("{{") && !(b.example?.[0] && /^https:\/\//.test(b.example[0]))) {
      found.push({ rule: "wa_url_example", severity: "fail", detail: `URL button "${b.text}" needs a full https example URL` });
    }
  }
  const stopText = STOP_BUTTON_TEXTS[t.language.split("_")[0]];
  if (t.category === "MARKETING") {
    if (!stopText) found.push({ rule: "wa_stop_button", severity: "fail", detail: `no "Stop promotions" button text for language ${t.language} in STOP_BUTTON_TEXTS` });
    else if (!buttons.some((b) => b.type === "QUICK_REPLY" && b.text === stopText)) {
      found.push({ rule: "wa_stop_button", severity: "fail", detail: `MARKETING template needs a "${stopText}" quick reply` });
    }
  }
  if (t.category === "UTILITY") found.push(...promotionFindings(body.text, []));
  return found;
}

const readTemplates = <T>(file: string): T[] => JSON.parse(readFileSync(dir("templates", file), "utf8")).templates as T[];

export const loadSmsTemplates = () => readTemplates<SmsTemplate>("sms.json");
export const loadPushTemplates = () => readTemplates<PushTemplate>("push.json");
export const loadWhatsAppTemplates = () => readTemplates<WhatsAppTemplate>("whatsapp.json");

export const failures = (findings: Finding[]) => findings.filter((f) => f.severity === "fail");
