import { describe, expect, it } from "vitest";
import {
  checkLinks, checkPushTemplate, checkSmsTemplate, checkWhatsAppTemplate, failures,
  loadPushTemplates, loadSmsTemplates, loadWhatsAppTemplates, type SmsTemplate, type WhatsAppTemplate,
} from "../src/template-check.js";

const rules = (findings: { rule: string }[]) => findings.map((f) => f.rule);

describe("template library", () => {
  it("has the SMS, push and WhatsApp templates from the service design", () => {
    expect(loadSmsTemplates()).toHaveLength(25);
    expect(loadPushTemplates()).toHaveLength(8);
    expect(loadWhatsAppTemplates()).toHaveLength(11);
  });

  for (const t of loadSmsTemplates()) it(`SMS ${t.id} passes every check`, () => expect(failures(checkSmsTemplate(t))).toEqual([]));
  for (const t of loadPushTemplates()) it(`push ${t.id} passes every check`, () => expect(failures(checkPushTemplate(t))).toEqual([]));
  for (const t of loadWhatsAppTemplates()) it(`WhatsApp ${t.name} passes every check`, () => expect(failures(checkWhatsAppTemplate(t))).toEqual([]));
});

describe("SMS template checks", () => {
  const base: SmsTemplate = { id: "T", category: "marketing", language: "en", text: "{{brand}}: {{product}} is back: {{link}} Reply STOP to opt out" };

  it("needs the brand first and an opt-out line on marketing", () => {
    expect(rules(checkSmsTemplate({ ...base, text: "New: {{link}} Reply STOP to opt out" }))).toContain("brand_first");
    expect(rules(checkSmsTemplate({ ...base, text: "{{brand}}: {{product}} is back: {{link}}" }))).toContain("optout_line");
    expect(rules(checkSmsTemplate({ ...base, category: "utility", text: "{{brand}}: Your order ships. {{track_link}}" }))).toEqual([]);
  });

  it("refuses an offer in a utility SMS", () => {
    expect(rules(checkSmsTemplate({ ...base, category: "utility", text: "{{brand}}: Order shipped. Get {{offer}} next time: {{link}}" }))).toContain("utility_no_promotion");
    expect(rules(checkSmsTemplate({ ...base, category: "utility", text: "{{brand}}: Order shipped. Big sale now" }))).toContain("utility_no_promotion");
  });

  it("allows 1 link and at most 2 segments, and warns on curly quotes", () => {
    expect(rules(checkSmsTemplate({ ...base, text: `${base.text} {{cart_link}}` }))).toContain("one_link");
    const long = { ...base, text: `{{brand}}: ${"x".repeat(300)} Reply STOP to opt out` };
    expect(checkSmsTemplate(long)).toContainEqual(expect.objectContaining({ rule: "max_segments", severity: "fail" }));
    expect(checkSmsTemplate({ ...base, text: "{{brand}}: It’s back: {{link}} Reply STOP to opt out" })).toContainEqual(
      expect.objectContaining({ rule: "accidental_unicode", severity: "warn" }),
    );
  });
});

describe("link checks", () => {
  it("refuses public shorteners and links off the branded domain", () => {
    expect(checkLinks("Shop: https://bit.ly/abc", ["pithcoffee.com"])).toContainEqual(expect.objectContaining({ rule: "branded_link" }));
    expect(checkLinks("Shop: go.pithcoffee.com/abc", ["pithcoffee.com"])).toEqual([]);
    expect(checkLinks("Shop: go.other.com/abc", ["pithcoffee.com"])).toContainEqual(expect.objectContaining({ rule: "branded_link" }));
    expect(rules(checkLinks("a go.pithcoffee.com/1 b go.pithcoffee.com/2"))).toEqual(["one_link"]);
  });
});

describe("push template checks", () => {
  it("limits the title to 40 and the body to 120 characters, and needs a deep link", () => {
    const t = { id: "P", flow: "F09", category: "marketing" as const, title: "x".repeat(41), body: "y".repeat(121), deep_link: "home" };
    expect(rules(checkPushTemplate(t)).sort()).toEqual(["deep_link", "push_body_length", "push_title_length"]);
  });
});

describe("WhatsApp template checks", () => {
  const cart = loadWhatsAppTemplates().find((t) => t.name === "cart_reminder_v1")!;
  const without = (t: WhatsAppTemplate, type: string): WhatsAppTemplate => ({ ...t, components: t.components.filter((c) => c.type !== type) });

  it("needs the Stop promotions button on every marketing template, in the template language", () => {
    expect(rules(checkWhatsAppTemplate(without(cart, "BUTTONS")))).toContain("wa_stop_button");
    expect(rules(checkWhatsAppTemplate({ ...cart, language: "ar" }))).toContain("wa_stop_button");
    expect(rules(checkWhatsAppTemplate({ ...cart, language: "de" }))[0]).toBe("wa_stop_button");
  });

  it("needs 1 example per variable and a full https URL example", () => {
    const body = cart.components.find((c) => c.type === "BODY")!;
    const fewer = { ...cart, components: cart.components.map((c) => (c === body ? { ...c, example: { body_text: [["Sara"]] } } : c)) };
    expect(rules(checkWhatsAppTemplate(fewer))).toContain("wa_examples");
    const buttons = cart.components.find((c) => c.type === "BUTTONS")!;
    const badUrl = {
      ...cart,
      components: cart.components.map((c) => (c === buttons ? { ...c, buttons: c.buttons!.map((b) => (b.type === "URL" ? { ...b, example: ["abc123"] } : b)) } : c)),
    };
    expect(rules(checkWhatsAppTemplate(badUrl))).toContain("wa_url_example");
  });

  it("refuses a promotion in a utility template and a bad name", () => {
    expect(rules(checkWhatsAppTemplate({ ...cart, category: "UTILITY", components: [{ type: "BODY", text: "20% off today" }] }))).toContain("utility_no_promotion");
    expect(rules(checkWhatsAppTemplate({ ...cart, name: "Cart Reminder" }))).toContain("wa_name");
  });
});
