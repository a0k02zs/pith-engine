import { describe, expect, it } from "vitest";
import { validateOutput } from "../src/registry.js";

const email = {
  email_key: "B2C-01.1",
  market: "GB",
  language: "en-GB",
  subjects: ["Welcome to Northwind", "You are in. Here is 10% off", "Skincare with 5 ingredients"],
  previews: ["Your welcome gift is inside", "Start here", "What to expect from us"],
  bodies: [{ variant: "A", html: "<p>Hello</p>", text: "Hello" }, { variant: "B", text: "Hi" }],
  cta: "Shop cleansers",
  alt_texts: ["Northwind cleanser bottle"],
  claim_ids: ["clm-5-ingredients"],
  needs_native_editor: false,
};
const drafts = { emails: [email], template_reused: false, new_claim_ids: [], new_claim_requests: [], blockers: [] };

describe("output schemas", () => {
  it("accepts complete drafts", () => {
    expect(validateOutput("email/drafts@1", drafts).valid).toBe(true);
  });

  it("needs exactly 3 subject lines and at most 2 bodies", () => {
    expect(validateOutput("email/drafts@1", { ...drafts, emails: [{ ...email, subjects: email.subjects.slice(0, 2) }] }).valid).toBe(false);
    const three = [...email.bodies, { variant: "A", text: "x" }];
    expect(validateOutput("email/drafts@1", { ...drafts, emails: [{ ...email, bodies: three }] }).valid).toBe(false);
  });

  it("accepts a calendar send at a time or after iftar, and rejects a bad time", () => {
    const send = { send_id: "s1", date: "2027-03-12", local_time: "19:00", markets: ["AE"], segment: "engaged", goal: "sales", kpi: "revenue_per_recipient", test_variable: "subject" };
    const cal = { month: "2027-03", sends: [send], flow_work: [{ flow_code: "B2C-03", action: "fix", reason: "Low click rate" }], risks: [], blockers: [] };
    expect(validateOutput("email/calendar@1", cal).valid).toBe(true);
    expect(validateOutput("email/calendar@1", { ...cal, sends: [{ ...send, local_time: "after_iftar" }] }).valid).toBe(true);
    expect(validateOutput("email/calendar@1", { ...cal, sends: [{ ...send, local_time: "7pm" }] }).valid).toBe(false);
  });

  it("caps outbound at 50 sends per mailbox per day", () => {
    const plan = { groups: [{ role: "CFO", signal: "hiring", angle: "close speed", contact_count: 40 }], excluded: [], mailboxes: ["sam@try-ledgerly.com"], daily_cap: 50, start_date: "2027-01-11", blockers: [] };
    expect(validateOutput("email/outbound_plan@1", plan).valid).toBe(true);
    expect(validateOutput("email/outbound_plan@1", { ...plan, daily_cap: 51 }).valid).toBe(false);
  });

  it("accepts only the known reply classes", () => {
    expect(validateOutput("email/reply_class@1", { class: "legal", confidence: 0.92, quote: "I will report you" }).valid).toBe(true);
    expect(validateOutput("email/reply_class@1", { class: "angry", confidence: 0.9, quote: "x" }).valid).toBe(false);
  });

  it("allows at most 3 learnings and needs evidence", () => {
    const l = { text: "Product-name subjects win", market: "GB", segment: "repeat", evidence: { n: 24000, metric: "ctr", lift: 0.18, confidence: 0.96, date: "2026-10-30" } };
    expect(validateOutput("email/learning@1", { learnings: [l] }).valid).toBe(true);
    expect(validateOutput("email/learning@1", { learnings: [l, l, l, l] }).valid).toBe(false);
    expect(validateOutput("email/learning@1", { learnings: [{ ...l, evidence: undefined }] }).valid).toBe(false);
  });

  it("throws on an unknown schema ref", () => {
    expect(() => validateOutput("email/nope@1", {})).toThrow(/Unknown output schema/);
  });
});
