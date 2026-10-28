import { describe, expect, it } from "vitest";
import { accountEngagement, engagementScore, fitScore, grade, scoreLead, tuningAdvice, type ClientIcp, type ContactProfile } from "../src/score.js";
import { localTools } from "../src/tools.js";

const icp: ClientIcp = {
  size_bands: ["201-1000"], size_bands_adjacent: ["51-200", "1001-5000"], industries: ["fintech"], industries_secondary: ["banking"],
  buyer_functions: ["finance"], technologies: ["netsuite"], sales_regions: ["GB", "SG", "US", "CA", "AE", "SA"], competitor_domains: ["rival.io"],
};
const ideal: ContactProfile = {
  company_size_band: "201-1000", industry: "fintech", job_seniority: "vp", job_function: "finance", country_code: "GB",
  tech_stack: ["netsuite", "slack"], email_domain: "acme.co.uk", email_domain_type: "business",
};
const now = new Date("2027-01-15T10:00:00Z");
const ago = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();

describe("fit score", () => {
  it("gives 50 to a contact that matches every ICP rule", () => {
    const r = fitScore(ideal, icp);
    expect(r.fit).toBe(50);
    expect(r.rules).toEqual({ "fit.size.icp": 15, "fit.industry.icp": 10, "fit.seniority.exec": 10, "fit.function": 8, "fit.country": 5, "fit.tech": 2 });
  });
  it("takes 10 off for a free email domain and never goes below 0", () => {
    expect(fitScore({ ...ideal, email_domain_type: "free" }, icp).fit).toBe(40);
    expect(fitScore({ country_code: "GB", email_domain_type: "free" }, { ...icp, sales_regions: [] }).fit).toBe(0);
  });
  it("counts only the first rule in an exclusive group", () => {
    const both = { ...icp, size_bands_adjacent: ["201-1000"], industries_secondary: ["fintech"] };
    expect(fitScore(ideal, both).rules).not.toHaveProperty("fit.size.adjacent");
    expect(fitScore({ ...ideal, company_size_band: "51-200", industry: "banking", job_seniority: "manager" }, icp).fit).toBe(7 + 5 + 6 + 8 + 5 + 2);
  });
  it("matches a subdivision against its country", () => {
    expect(fitScore({ ...ideal, country_code: "CA-QC" }, icp).rules["fit.country"]).toBe(5);
  });
  it("disqualifies competitors, students, job seekers and countries outside the 5 markets", () => {
    expect(fitScore({ ...ideal, email_domain: "rival.io" }, icp).disqualified).toBe(true);
    expect(fitScore({ ...ideal, persona_flag: "student" }, icp).disqualified).toBe(true);
    expect(fitScore({ ...ideal, persona_flag: "job_seeker" }, icp).disqualified).toBe(true);
    expect(fitScore({ ...ideal, country_code: "JP" }, icp).disqualified).toBe(true);
    expect(fitScore({ ...ideal, country_code: "DE" }, icp).disqualified).toBe(false);
    expect(fitScore({ ...ideal, country_code: undefined }, icp).disqualified).toBe(true);
  });
});

describe("engagement score", () => {
  it("caps each rule per 30 days", () => {
    const views = [1, 2, 3].map((d) => ({ event: "page.viewed", at: ago(d), props: { page_type: "pricing" } }));
    expect(engagementScore(views, now).engagement).toBe(20);
    const clicks = Array.from({ length: 8 }, (_, i) => ({ event: "email.clicked", at: ago(i + 1) }));
    expect(engagementScore(clicks, now).rules["eng.email_click"]).toBe(10);
  });
  it("gives points again once the 30-day window has passed", () => {
    const views = [40, 39, 38, 1].map((d) => ({ event: "page.viewed", at: ago(d), props: { page_type: "pricing" } }));
    expect(engagementScore(views, now).rules["eng.pricing_view"]).toBe(30);
  });
  it("caps the total at 50", () => {
    const e = [{ event: "trial.started", at: ago(2) }, { event: "form.submitted", at: ago(1), props: { form_type: "demo" } }];
    expect(engagementScore(e, now).engagement).toBe(50);
  });
  it("loses 25% for each 30 days with no new action", () => {
    const e = [{ event: "trial.started", at: ago(61) }, { event: "webinar.attended", at: ago(61) }];
    expect(engagementScore(e, now).engagement).toBeCloseTo(35 * 0.75 ** 2, 1);
    expect(engagementScore(e, new Date(now.getTime() - 40 * 86_400_000)).engagement).toBe(35);
  });
  it("does not let a negative event reset the decay clock", () => {
    const e = [{ event: "trial.started", at: ago(35) }, { event: "page.viewed", at: ago(1), props: { page_type: "careers" } }];
    expect(engagementScore(e, now).engagement).toBeCloseTo(25 * 0.75 - 5, 0);
  });
  it("sets engagement to 0 and flags the record on a hard bounce", () => {
    const e = [{ event: "trial.started", at: ago(3) }, { event: "email.hard_bounced", at: ago(2) }];
    const r = engagementScore(e, now);
    expect(r.engagement).toBe(0);
    expect(r.flags).toEqual(["invalid_email"]);
  });
  it("counts a hand-raise for 90 days", () => {
    const hr = (d: number) => [{ event: "form.submitted", at: ago(d), props: { form_type: "pricing" } }];
    expect(engagementScore(hr(89), now).handraise).toBe(true);
    expect(engagementScore(hr(91), now).handraise).toBe(false);
    expect(engagementScore([{ event: "form.submitted", at: ago(1), props: { form_type: "newsletter" } }], now).handraise).toBe(false);
  });
  it("ignores events after now", () => {
    expect(engagementScore([{ event: "trial.started", at: "2027-02-01T00:00:00Z" }], now).engagement).toBe(0);
  });
});

describe("grades", () => {
  it("follows the thresholds", () => {
    expect(grade(25, 55, true)).toBe("A");
    expect(grade(24, 54, true)).toBe("C");
    expect(grade(40, 80, false)).toBe("A");
    expect(grade(39, 85, false)).toBe("C");
    expect(grade(40, 79, false)).toBe("B");
    expect(grade(40, 65, false)).toBe("B");
    expect(grade(40, 64, false)).toBe("C");
    expect(grade(20, 29, false)).toBe("D");
    expect(grade(10, 29, true)).toBe("D");
  });
  it("puts a hand-raise from an ICP contact straight to MQL grade A", () => {
    const r = scoreLead(ideal, [{ event: "form.submitted", at: ago(0), props: { form_type: "demo" } }], icp, now);
    expect(r).toMatchObject({ fit: 50, engagement: 30, total: 80, grade: "A", stage: "mql", handraise: true, model_version: "1.0.0" });
  });
  it("keeps a low-engagement ICP contact in nurture and a disqualified one out", () => {
    expect(scoreLead(ideal, [], icp, now)).toMatchObject({ grade: "C", stage: "lead", track: "nurture" });
    expect(scoreLead({ ...ideal, email_domain: "rival.io" }, [], icp, now)).toMatchObject({ grade: null, stage: "disqualified" });
    expect(scoreLead({ country_code: "GB" }, [], icp, now)).toMatchObject({ grade: "D", track: "newsletter" });
  });
  it("is the crm_ops tool action score.calculate", () => {
    const r = localTools["score.calculate"]({ contact: ideal, events: [], icp, now: now.toISOString() });
    expect(r.fit).toBe(50);
    expect(() => localTools["score_model.publish_version"]({ model: {} as never, approval_id: "" })).toThrow(/G3/);
  });
});

describe("account roll-up and tuning", () => {
  it("sums the top 3 contacts and caps at 100", () => {
    expect(accountEngagement([10, 5])).toBe(15);
    expect(accountEngagement([30, 20, 10, 25])).toBe(75);
    expect(accountEngagement([50, 50, 50])).toBe(100);
  });
  it("raises thresholds under 15% and lowers them over 50%", () => {
    expect(tuningAdvice({ mqls: 200, sqls: 20, sql_rate_a: 0.3, sql_rate_b: 0.05 }).action).toBe("raise_thresholds");
    expect(tuningAdvice({ mqls: 200, sqls: 120, sql_rate_a: 0.9, sql_rate_b: 0.2 }).action).toBe("lower_thresholds");
    expect(tuningAdvice({ mqls: 200, sqls: 60, sql_rate_a: 0.6, sql_rate_b: 0.2 })).toMatchObject({ action: "keep", notes: [] });
  });
  it("flags a weak hot vs warm lift and a rate outside 25% to 40%", () => {
    const r = tuningAdvice({ mqls: 200, sqls: 40, sql_rate_a: 0.3, sql_rate_b: 0.15 });
    expect(r.action).toBe("keep");
    expect(r.notes).toHaveLength(2);
  });
  it("proposes nothing under 100 MQLs", () => {
    expect(tuningAdvice({ mqls: 99, sqls: 5, sql_rate_a: 0, sql_rate_b: 0 }).action).toBe("too_few");
  });
});
