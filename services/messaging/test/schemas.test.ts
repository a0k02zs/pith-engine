import { describe, expect, it } from "vitest";
import { validateOutput } from "../src/registry.js";
import { buildSystemPrompt } from "../src/prompt.js";
import { resolveMarket } from "../src/market-rules.js";

describe("output schemas", () => {
  it("accepts a plan and refuses an unknown flow or a bad time", () => {
    const plan = {
      client_id: "c1", period: "2026-12",
      flows: [{ flow_id: "F02", action: "add", markets: ["AE"], channel_by_market: { AE: "whatsapp" }, reason: "Cart events exist", needs_offer: false }],
      broadcasts: [{ name: "National Day", market: "AE", channel: "whatsapp", date_local: "2026-12-02", time_local: "19:00", segment: "engaged_90d", offer_id: "off-1", est_recipients: 12000, est_cost: "AED 1900" }],
      tracking_requests: [], risks: [], summary: "Add the cart flow in the UAE.",
    };
    expect(validateOutput("messaging/plan@1", plan).valid).toBe(true);
    expect(validateOutput("messaging/plan@1", { ...plan, flows: [{ ...plan.flows[0], flow_id: "F14" }] }).valid).toBe(false);
    expect(validateOutput("messaging/plan@1", { ...plan, broadcasts: [{ ...plan.broadcasts[0], time_local: "7pm" }] }).valid).toBe(false);
  });

  it("accepts drafts and refuses an SMS of 3 segments", () => {
    const d = { template_id: "S-CART-1H", flow_id: "F02", channel: "sms", market: "GB", language: "en-GB", category: "MARKETING", variant: "A", content: "Pith Coffee: ...", encoding: "GSM-7", segments: 1, claims_used: [], offer_id: null, needs_native_review: false, notes: "" };
    expect(validateOutput("messaging/write@1", { drafts: [d], blockers: [] }).valid).toBe(true);
    expect(validateOutput("messaging/write@1", { drafts: [{ ...d, segments: 3 }], blockers: [] }).valid).toBe(false);
  });

  it("accepts only the 14 pre-check ids", () => {
    const r = { item_id: "S-CART-1H", result: "warn", checks: [{ id: "window", result: "warn", reason: "not checked" }], fixes: [], needs_legal: false };
    expect(validateOutput("messaging/precheck@1", r).valid).toBe(true);
    expect(validateOutput("messaging/precheck@1", { ...r, checks: [{ id: "vibes", result: "pass", reason: "x" }] }).valid).toBe(false);
  });

  it("needs text on a chat reply and a summary on a handoff, and max 3 buttons", () => {
    expect(validateOutput("messaging/chat@1", { action: "reply", text: "Your order ships today." }).valid).toBe(true);
    expect(validateOutput("messaging/chat@1", { action: "reply" }).valid).toBe(false);
    expect(validateOutput("messaging/chat@1", { action: "handoff", text: "Our team replies within 1 hour." }).valid).toBe(false);
    expect(validateOutput("messaging/chat@1", { action: "handoff", text: "Our team replies within 1 hour.", handoff: { reason: "refund", summary: "Wants a refund." } }).valid).toBe(true);
    expect(validateOutput("messaging/chat@1", { action: "reply", text: "Pick 1", buttons: ["a", "b", "c", "d"] }).valid).toBe(false);
  });

  it("accepts optimizer output, a report and a sender record", () => {
    expect(validateOutput("messaging/optimize@1", { actions_taken: [{ type: "winner", target: "bc-1", reason: "B wins at 96%", data: "cvr 2.1% vs 1.6%, n=9000" }], proposals: [], alerts: [] }).valid).toBe(true);
    const report = { headline: "Revenue per message up 12%", scorecard: [{ kpi: "revenue_per_message", this_week: "£0.42", change: "+12%", target: "£0.35" }], worked: [], did_not: [], decisions: [], next_week: [], markdown: "# Week 45" };
    expect(validateOutput("messaging/report@1", report).valid).toBe(true);
    expect(validateOutput("messaging/report@1", { ...report, worked: ["a", "b", "c", "d"] }).valid).toBe(false);
    expect(validateOutput("messaging/sender@1", { market: "SG", channel: "sms", sender_type: "alphanumeric", sender_id: "PITHCOFFEE", registration_ref: "SSIR-123", status: "approved" }).valid).toBe(true);
  });

  it("throws on an unknown schema ref", () => {
    expect(() => validateOutput("messaging/nope@1", {})).toThrow(/Unknown output schema/);
  });
});

describe("system prompts", () => {
  it("fills the brand, the brain, the market rules and the channel", () => {
    const brain = { client_id: "c1", organization: { name: "Pith Coffee" }, banned_terms: ["cheap"] };
    const { model, system } = buildSystemPrompt("messaging/chat@1", brain, resolveMarket("AE"), { channel: "WhatsApp" });
    expect(model).toMatch(/^claude-/);
    expect(system).toContain("You are the Pith Coffee assistant on WhatsApp.");
    expect(system).toContain('"banned_terms":["cheap"]');
    expect(system).toContain('"market":"AE"');
    expect(system).not.toMatch(/\{brain|\{market_rules\}|\{channel\}|\{\{brand\}\}/);
  });
});
