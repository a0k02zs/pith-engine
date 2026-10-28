import { dirFor, rulesFor } from "./market-rules.js";

/**
 * Deterministic checks on a filled page before QA (docs/04-templates.md section 5).
 * The cro/qa agent gets these findings as input. A "block" finding fails QA, and the page cannot reach gate G3.
 */

export type Severity = "block" | "fix";

export interface PageFinding {
  rule:
    | "unfilled_slot"
    | "lang"
    | "dir"
    | "consent_block"
    | "pre_ticked"
    | "privacy_link"
    | "legal_footer"
    | "image_size"
    | "image_alt"
    | "input_label"
    | "urgency";
  severity: Severity;
  detail: string;
}

export interface PageCheckInput {
  html: string;
  /** Market code, for example "GB" or "AE". */
  market: string;
  /** Page language, for example "ar-AE". Must be 1 of the market's languages. */
  lang: string;
  /** Privacy notice URL for the market. When given, the page must link to it. */
  privacyUrl?: string;
  /** True when the page has a form. Then the consent block is required. Default true. */
  hasForm?: boolean;
}

export interface PageCheckResult {
  pass: boolean;
  findings: PageFinding[];
}

const attr = (tag: string, name: string): string | null => {
  const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  if (!m) return new RegExp(`\\s${name}(\\s|/?>)`, "i").test(tag) ? "" : null;
  return m[2] ?? m[3] ?? m[4] ?? "";
};

const tags = (html: string, name: string) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))];

/** Text that suggests a countdown or scarcity claim. A person must confirm it is true (playbook 3, dark patterns). */
const URGENCY = [
  /\bonly \d+ (left|remaining|spots?|seats?)\b/i,
  /\b(offer|sale|deal) ends (today|tonight|in \d+)/i,
  /\bhurry\b/i,
  /\blast chance\b/i,
  /\b\d+ (people|others) (are )?(viewing|looking at) this\b/i,
  /data-countdown/i,
];

export function checkPage(input: PageCheckInput): PageCheckResult {
  const { html } = input;
  const rules = rulesFor(input.market);
  const findings: PageFinding[] = [];
  const add = (rule: PageFinding["rule"], severity: Severity, detail: string) => findings.push({ rule, severity, detail });

  // Comments can mention slots and rules; check only what renders.
  const body = html.replace(/<!--[\s\S]*?-->/g, "");

  const slots = [...new Set([...body.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map((m) => m[1]))];
  if (slots.length > 0) add("unfilled_slot", "block", `Unfilled slots: ${slots.join(", ")}`);

  const htmlTag = tags(body, "html")[0]?.[0] ?? "";
  const lang = attr(htmlTag, "lang");
  if (!rules.lang.includes(input.lang)) {
    add("lang", "block", `${input.lang} is not a language for ${input.market} (${rules.lang.join(", ")})`);
  }
  if (lang !== input.lang) add("lang", "block", `html lang is "${lang ?? ""}", expected "${input.lang}"`);
  const dir = attr(htmlTag, "dir") ?? "ltr";
  if (dir !== dirFor(input.lang)) add("dir", "block", `html dir is "${dir}", expected "${dirFor(input.lang)}"`);

  if ((input.hasForm ?? true) && !/data-slot\s*=\s*"consent_block"/i.test(body)) {
    add("consent_block", "block", "The consent block is missing");
  }
  for (const [tag] of tags(body, "input")) {
    if ((attr(tag, "type") ?? "").toLowerCase() === "checkbox" && attr(tag, "checked") !== null) {
      add("pre_ticked", "block", `Pre-ticked checkbox: ${attr(tag, "name") ?? tag}`);
    }
  }

  const footer = /<footer\b[^>]*data-section\s*=\s*"legal_footer"[^>]*>([\s\S]*?)<\/footer>/i.exec(body);
  if (!footer) add("legal_footer", "block", "The legal footer is missing");
  if (input.privacyUrl) {
    const hrefs = tags(body, "a").map(([t]) => attr(t, "href"));
    if (!hrefs.includes(input.privacyUrl)) add("privacy_link", "block", `No link to ${input.privacyUrl}`);
  } else if (!footer || !/<a\b[^>]*href\s*=\s*"[^"#][^"]*"/i.test(footer[1])) {
    add("privacy_link", "block", "The legal footer has no privacy link");
  }

  for (const [tag] of tags(body, "img")) {
    const src = attr(tag, "src") ?? "?";
    if (attr(tag, "width") === null || attr(tag, "height") === null) add("image_size", "fix", `Image without width and height: ${src}`);
    if (attr(tag, "alt") === null) add("image_alt", "fix", `Image without alt text: ${src}`);
  }

  const labels = [...body.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/gi)].map((m) => ({
    from: m.index!,
    to: m.index! + m[0].length,
    for: attr(m[0].slice(0, m[0].indexOf(">") + 1), "for"),
  }));
  for (const m of tags(body, "(input|select|textarea)")) {
    const tag = m[0];
    const type = (attr(tag, "type") ?? "").toLowerCase();
    if (["hidden", "submit", "button", "image", "reset"].includes(type)) continue;
    const id = attr(tag, "id");
    const labelled =
      !!attr(tag, "aria-label") ||
      !!attr(tag, "aria-labelledby") ||
      (id !== null && labels.some((l) => l.for === id)) ||
      labels.some((l) => m.index! > l.from && m.index! < l.to);
    if (!labelled) add("input_label", "block", `Field without a label: ${attr(tag, "name") ?? tag}`);
  }

  const text = body.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "");
  for (const re of URGENCY) {
    const hit = re.exec(text);
    if (hit) add("urgency", "fix", `Urgency or scarcity text "${hit[0]}": confirm it is true and in brain.offers, or remove it`);
  }

  return { pass: !findings.some((f) => f.severity === "block"), findings };
}

/** Fill {{slot}} values in a template. Values are HTML-escaped unless the slot name ends in _html or _items. */
export function fillTemplate(template: string, values: Record<string, string>): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return template.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/g, (whole, key: string) => {
    if (!(key in values)) return whole;
    const raw = /(_html|_items|_fields|_checkboxes|_marks|_or_form|_media)$/.test(key);
    return raw ? values[key] : esc(values[key]);
  });
}
