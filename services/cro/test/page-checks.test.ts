import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dir } from "../src/paths.js";
import { checkPage, fillTemplate } from "../src/page-checks.js";

const template = readFileSync(dir("templates", "landing-page-base.html"), "utf8");
const slots = [...new Set([...template.replace(/<!--[\s\S]*?-->/g, "").matchAll(/\{\{([a-z0-9_]+)\}\}/g)].map((m) => m[1]))];

const values = (over: Record<string, string> = {}) => {
  const v: Record<string, string> = Object.fromEntries(slots.map((s) => [s, `${s} text`]));
  Object.assign(v, {
    lang: "en-GB",
    dir: "ltr",
    privacy_url: "https://example.com/privacy",
    proof_items: '<img src="/a.svg" alt="Client A" width="80" height="24">',
    hero_media_or_form: '<img src="/hero.webp" alt="Dashboard" width="560" height="360">',
    faq_items: "<details><summary>Q</summary><p>A</p></details>",
    form_fields: '<label for="email">Work email</label><input id="email" name="email" type="email">',
    consent_checkboxes: '<label class="consent"><input type="checkbox" name="consent_email"> Email me product news</label>',
    payment_marks: "",
  });
  return { ...v, ...over };
};

const page = (over: Record<string, string> = {}) => fillTemplate(template, values(over));

describe("checkPage on the base template", () => {
  it("passes a complete UK page", () => {
    const r = checkPage({ html: page(), market: "GB", lang: "en-GB", privacyUrl: "https://example.com/privacy" });
    expect(r.findings).toEqual([]);
    expect(r.pass).toBe(true);
  });

  it("blocks the unfilled template", () => {
    const r = checkPage({ html: template, market: "GB", lang: "en-GB" });
    expect(r.pass).toBe(false);
    expect(r.findings.map((f) => f.rule)).toContain("unfilled_slot");
  });

  it("blocks a {{MISSING}} marker from an agent", () => {
    const r = checkPage({ html: page({ headline: "{{MISSING: customer count}}" }).replace("{{MISSING: customer count}}", "{{MISSING: customer count}}"), market: "GB", lang: "en-GB" });
    expect(r.findings.some((f) => f.rule === "unfilled_slot")).toBe(true);
  });

  it("needs dir=rtl on an Arabic page", () => {
    const r = checkPage({ html: page({ lang: "ar-AE" }), market: "AE", lang: "ar-AE" });
    expect(r.findings.map((f) => f.rule)).toEqual(["dir"]);
    expect(checkPage({ html: page({ lang: "ar-AE", dir: "rtl" }), market: "AE", lang: "ar-AE" }).pass).toBe(true);
  });

  it("blocks a language that the market does not use", () => {
    const r = checkPage({ html: page({ lang: "de-DE" }), market: "GB", lang: "de-DE" });
    expect(r.findings.some((f) => f.rule === "lang")).toBe(true);
  });

  it("blocks a pre-ticked consent box", () => {
    const html = page({ consent_checkboxes: '<label><input type="checkbox" name="consent_email" checked> Email me</label>' });
    const r = checkPage({ html, market: "GB", lang: "en-GB" });
    expect(r.pass).toBe(false);
    expect(r.findings.map((f) => f.rule)).toEqual(["pre_ticked"]);
  });

  it("blocks a page without the consent block or legal footer", () => {
    const noConsent = page().replace('data-slot="consent_block"', "");
    expect(checkPage({ html: noConsent, market: "GB", lang: "en-GB" }).findings.map((f) => f.rule)).toContain("consent_block");
    const noFooter = page().replace(/<footer class="legal"[\s\S]*?<\/footer>/, "");
    const rules = checkPage({ html: noFooter, market: "GB", lang: "en-GB" }).findings.map((f) => f.rule);
    expect(rules).toContain("legal_footer");
    expect(rules).toContain("privacy_link");
  });

  it("blocks a missing link to the market privacy notice", () => {
    const r = checkPage({ html: page(), market: "GB", lang: "en-GB", privacyUrl: "https://example.com/privacy-uk" });
    expect(r.findings.map((f) => f.rule)).toEqual(["privacy_link"]);
  });

  it("asks for a fix on images without size or alt text", () => {
    const r = checkPage({ html: page({ hero_media_or_form: '<img src="/hero.webp">' }), market: "GB", lang: "en-GB" });
    expect(r.findings.map((f) => f.rule).sort()).toEqual(["image_alt", "image_size"]);
    expect(r.pass).toBe(true);
  });

  it("blocks a form field without a label", () => {
    const r = checkPage({ html: page({ form_fields: '<input name="email" type="email" placeholder="Email">' }), market: "GB", lang: "en-GB" });
    expect(r.findings.map((f) => f.rule)).toEqual(["input_label"]);
  });

  it("flags countdown and scarcity text for a person to confirm", () => {
    const r = checkPage({ html: page({ subheadline: "Hurry: only 3 left at this price" }), market: "GB", lang: "en-GB" });
    expect(r.findings.filter((f) => f.rule === "urgency").length).toBe(2);
    expect(r.pass).toBe(true);
  });
});

describe("fillTemplate", () => {
  it("escapes text slots and keeps HTML slots", () => {
    const out = fillTemplate("<h1>{{headline}}</h1>{{faq_items}}", { headline: "<b>x</b> & y", faq_items: "<details></details>" });
    expect(out).toBe("<h1>&lt;b&gt;x&lt;/b&gt; &amp; y</h1><details></details>");
  });

  it("leaves unknown slots for checkPage to find", () => {
    expect(fillTemplate("{{a}} {{b}}", { a: "1" })).toBe("1 {{b}}");
  });
});
