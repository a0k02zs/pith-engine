import { describe, expect, it } from "vitest";
import { marketRules, requiredLocales } from "../src/market-rules.js";
import { adCategoryStatus, broadMatchAllowed, isAdWorkday, rsaFailures, shouldPauseCampaign, shouldPauseKeyword, spendAnomaly, splitChanges, type SpendPolicy } from "../src/sem.js";
import { citesClient, geoDropAlert, geoMetrics, isAiReferral, rollingWeekly, sourceGaps, type GeoObservation } from "../src/geo.js";
import { aiCrawlerAccess, decayReasons, hreflangFailures, robotsAllows, scheduleRoadmap } from "../src/seo.js";
import { briefFailures, openSourceMarkers } from "../src/brief.js";
import { buildSystemPrompt } from "../src/prompt.js";

describe("market rules", () => {
  it("maps GB to UK and EU countries to EU", () => {
    expect(marketRules("GB").currency).toBe("GBP");
    expect(marketRules("NL").compliance_rules).toContain("EU-OMNIBUS-PRICE");
  });

  it("uses a Sunday to Thursday ad week in Saudi Arabia and Monday to Friday in the UAE", () => {
    const sunday = new Date("2026-11-01T09:00:00Z");
    expect(isAdWorkday(sunday, marketRules("SA"))).toBe(true);
    expect(isAdWorkday(sunday, marketRules("AE"))).toBe(false);
  });

  it("needs French in Quebec and Arabic for GCC B2C", () => {
    expect(requiredLocales("CA-QC", "b2b")).toEqual(["fr-CA"]);
    expect(requiredLocales("CA", "b2b")).toEqual([]);
    expect(requiredLocales("AE", "b2c")).toEqual(["ar-AE"]);
    expect(requiredLocales("AE", "b2b")).toEqual([]);
  });

  it("throws for a market with no rules", () => {
    expect(() => marketRules("JP")).toThrow("No search rules for market JP");
  });

  it("bans gambling ads in the GCC and flags US special categories", () => {
    expect(adCategoryStatus("gambling", marketRules("QA"))).toBe("banned");
    expect(adCategoryStatus("credit", marketRules("US"))).toBe("check");
    expect(adCategoryStatus("software", marketRules("US"))).toBe("ok");
  });
});

describe("SEM rules", () => {
  const policy: SpendPolicy = { approvedTotalDaily: 300, maxAutoChangePct: 20, targetCpa: 50, cpaPausePct: 50, cpaPauseDays: 3 };
  const budgets = { a: 100, b: 100, c: 100 };

  it("applies pauses and negatives at once", () => {
    const r = splitChanges([{ type: "add_negative", target: "free", reason: "" }, { type: "pause_keyword", target: "k1", reason: "" }], budgets, policy);
    expect(r.auto).toHaveLength(2);
  });

  it("auto-applies a budget move inside policy that keeps the total", () => {
    const r = splitChanges(
      [
        { type: "budget_move", target: "a", from: 100, to: 85, reason: "" },
        { type: "budget_move", target: "b", from: 100, to: 115, reason: "" },
      ],
      budgets,
      policy,
    );
    expect(r.auto).toHaveLength(2);
    expect(r.needsApproval).toHaveLength(0);
  });

  it("treats a move of exactly 20% as inside policy", () => {
    const r = splitChanges(
      [
        { type: "budget_move", target: "b", from: 100, to: 94, reason: "" },
        { type: "budget_move", target: "a", from: 30, to: 36, reason: "" },
      ],
      { a: 30, b: 100 },
      { ...policy, approvedTotalDaily: 130 },
    );
    expect(r.needsApproval).toEqual([]);
  });

  it("sends a move that raises the total, a move over 20%, or a new campaign to approval", () => {
    const r = splitChanges(
      [
        { type: "budget_move", target: "a", from: 100, to: 110, reason: "" },
        { type: "budget_move", target: "b", from: 100, to: 70, reason: "" },
        { type: "new_campaign", target: "brand-sg", reason: "" },
        { type: "bid_strategy", target: "c", reason: "" },
      ],
      budgets,
      policy,
    );
    expect(r.auto).toHaveLength(0);
    expect(r.needsApproval.map((c) => c.target)).toEqual(["a", "b", "brand-sg", "c"]);
  });

  it("pauses a keyword at 2x target CPA with no conversion, and a campaign after 3 bad days", () => {
    expect(shouldPauseKeyword(100, 0, 50)).toBe(true);
    expect(shouldPauseKeyword(99, 0, 50)).toBe(false);
    expect(shouldPauseKeyword(200, 1, 50)).toBe(false);
    expect(shouldPauseCampaign([40, 80, 90, 76], policy)).toBe(true);
    expect(shouldPauseCampaign([80, 90, 75], policy)).toBe(false);
    expect(shouldPauseCampaign([80, null, 90], policy)).toBe(false);
  });

  it("flags spend pace and CPC jumps", () => {
    expect(spendAnomaly({ spendToday: 80, dailyBudget: 100, hourOfDay: 12, cpcToday: 1, cpc7d: 1 })).toEqual(["pace"]);
    expect(spendAnomaly({ spendToday: 40, dailyBudget: 100, hourOfDay: 12, cpcToday: 2, cpc7d: 1 })).toEqual(["cpc_jump"]);
  });

  it("allows broad match only with Smart Bidding and 30 conversions", () => {
    expect(broadMatchAllowed(30, true)).toBe(true);
    expect(broadMatchAllowed(29, true)).toBe(false);
    expect(broadMatchAllowed(100, false)).toBe(false);
  });

  it("checks responsive search ads", () => {
    const ad = {
      headlines: [...Array(3).fill("Payroll software UK"), ...Array(12).fill("Fast setup")],
      descriptions: Array(4).fill("Run payroll in minutes."),
      final_url: "https://example.com",
    };
    expect(rsaFailures(ad, "payroll software", ["Acme"])).toEqual([]);
    const bad = { ...ad, headlines: [...ad.headlines.slice(0, 14), "Better than Acme payroll, honestly"] };
    expect(rsaFailures(bad, "payroll software", ["Acme"])).toEqual(["headline 15 is 34 characters", "competitor trademark in ad text: Acme"]);
  });
});

describe("GEO rules", () => {
  const obs = (o: Partial<GeoObservation>): GeoObservation => ({
    prompt_id: "p1",
    engine: "chatgpt",
    run: 1,
    date: "2026-10-21",
    client_mentioned: false,
    client_cited: false,
    position: null,
    competitors_mentioned: [],
    cited_domains: [],
    ...o,
  });

  it("computes citation share, mention share, position and share of voice", () => {
    const m = geoMetrics(
      [
        obs({ client_mentioned: true, client_cited: true, position: 1, competitors_mentioned: ["Rival"] }),
        obs({ client_mentioned: true, position: 3 }),
        obs({ competitors_mentioned: ["Rival", "rival", "Other"] }),
        obs({}),
      ],
      ["Rival"],
    );
    expect(m).toEqual({ runs: 4, ai_citation_share: 0.25, ai_mention_share: 0.5, ai_avg_position: 2, share_of_voice: 0.5 });
    expect(geoMetrics([], []).runs).toBe(0);
  });

  it("matches client subdomains and AI referrers", () => {
    expect(citesClient(["docs.example.com"], ["www.example.com"])).toBe(true);
    expect(citesClient(["notexample.com"], ["example.com"])).toBe(false);
    expect(isAiReferral("www.perplexity.ai")).toBe(true);
    expect(isAiReferral("google.com")).toBe(false);
  });

  it("reports a 4-week rolling average and alerts on a drop of more than 10 points", () => {
    expect(rollingWeekly([0.1, 0.2, 0.3])).toBeNull();
    const w = rollingWeekly([0.9, 0.2, 0.4, 0.2, 0.4])!;
    expect(w.average).toBeCloseTo(0.3);
    expect([w.min, w.max]).toEqual([0.2, 0.4]);
    expect(geoDropAlert(0.4, 0.25)).toBe(true);
    expect(geoDropAlert(0.4, 0.3)).toBe(false);
  });

  it("ranks source gaps from prompts where the client is missing", () => {
    const gaps = sourceGaps(
      [
        obs({ cited_domains: ["g2.com", "reddit.com", "example.com"] }),
        obs({ cited_domains: ["www.g2.com", "g2.com"] }),
        obs({ client_mentioned: true, cited_domains: ["capterra.com"] }),
      ],
      ["example.com"],
    );
    expect(gaps).toEqual([
      { domain: "g2.com", count: 2 },
      { domain: "reddit.com", count: 1 },
    ]);
  });
});

describe("SEO rules", () => {
  it("reads robots.txt like RFC 9309", () => {
    const robots = "User-agent: *\nDisallow: /private\nAllow: /private/ok\n\nUser-agent: GPTBot\nDisallow: /\n";
    expect(robotsAllows(robots, "Googlebot", "/")).toBe(true);
    expect(robotsAllows(robots, "Googlebot", "/private/x")).toBe(false);
    expect(robotsAllows(robots, "Googlebot", "/private/ok")).toBe(true);
    expect(robotsAllows(robots, "GPTBot", "/")).toBe(false);
    expect(robotsAllows("User-agent: *\nDisallow: /*.pdf$", "Bingbot", "/a.pdf")).toBe(false);
    expect(robotsAllows("User-agent: *\nDisallow: /*.pdf$", "Bingbot", "/a.pdf?x=1")).toBe(true);
  });

  it("flags a blocked AI search crawler as critical and leaves training crawlers to the client", () => {
    const access = aiCrawlerAccess("User-agent: OAI-SearchBot\nDisallow: /\n\nUser-agent: GPTBot\nDisallow: /\n");
    expect(access.find((a) => a.agent === "OAI-SearchBot")).toMatchObject({ allowed: false, issue: "critical" });
    expect(access.find((a) => a.agent === "Googlebot")).toMatchObject({ allowed: true, issue: null });
    expect(access.find((a) => a.agent === "GPTBot")).toMatchObject({ allowed: false, issue: "client_decision" });
  });

  it("checks hreflang sets", () => {
    const uk = { url: "https://x.com/uk/", locale: "en-GB", canonical: "https://x.com/uk/", hreflang: { "en-GB": "https://x.com/uk/", "en-US": "https://x.com/us/", "x-default": "https://x.com/" } };
    const us = { url: "https://x.com/us/", locale: "en-US", canonical: "https://x.com/us/", hreflang: { "en-GB": "https://x.com/uk/", "en-US": "https://x.com/us/", "x-default": "https://x.com/" } };
    expect(hreflangFailures([uk, us])).toEqual([]);
    expect(hreflangFailures([uk, { ...us, canonical: "https://x.com/uk/", hreflang: { "en-US": us.url } }])).toEqual([
      "https://x.com/us/: canonical is not self-referencing",
      "https://x.com/us/: no x-default",
      "https://x.com/us/: missing or wrong hreflang for en-GB",
    ]);
  });

  it("schedules critical items in month 1 and fills the remaining capacity in months 1 to 3 by priority", () => {
    const plan = scheduleRoadmap(
      [
        { id: "low", value: 1, confidence: 1, effort: 4 },
        { id: "crit", value: 1, confidence: 1, effort: 8, critical: true },
        { id: "high", value: 9, confidence: 1, effort: 1 },
        { id: "mid", value: 4, confidence: 1, effort: 1 },
        { id: "extra", value: 0.1, confidence: 1, effort: 10 },
      ],
      1,
    );
    expect(plan.map((p) => [p.id, p.month])).toEqual([
      ["crit", 1],
      ["high", 2],
      ["mid", 3],
      ["low", null],
      ["extra", null],
    ]);
  });

  it("finds pages to refresh", () => {
    const now = new Date("2026-10-23T00:00:00Z");
    expect(
      decayReasons({ clicksPrevious3m: 1000, clicksCurrent3m: 800, citationShareBefore: 0.4, citationShareNow: 0.3, oldestFactDate: new Date("2025-09-01") }, now),
    ).toEqual(["traffic_drop", "lost_ai_citations", "stale_fact"]);
    expect(
      decayReasons({ clicksPrevious3m: 1000, clicksCurrent3m: 900, citationShareBefore: 0.4, citationShareNow: 0.35, oldestFactDate: new Date("2026-01-01") }, now),
    ).toEqual([]);
    // 0.3 - 0.2 is 0.0999... in floating point; a 10 point drop still counts.
    expect(
      decayReasons({ clicksPrevious3m: 0, clicksCurrent3m: 0, citationShareBefore: 0.3, citationShareNow: 0.2, oldestFactDate: new Date("2026-01-01") }, now),
    ).toEqual(["lost_ai_citations"]);
  });
});

describe("brief and prompt rules", () => {
  const brief = {
    market: "SG",
    locale: "en-SG",
    main_question: "What is a CPF contribution?",
    direct_answer: "A CPF contribution is a monthly payment into the Central Provident Fund.",
    title_tag: "CPF contributions explained",
    meta_description: "How CPF contributions work.",
    facts: [{ text: "Rates change by age", source_url: "https://www.cpf.gov.sg" }],
    claims: [{ text: "Trusted by 500 SG firms", new_claim: false }],
    internal_links_out: ["/a", "/b", "/c"],
  };

  it("passes a good brief and allows zh-SG as an extra Singapore locale", () => {
    expect(briefFailures(brief, ["Trusted by 500 SG firms"], marketRules("SG"))).toEqual([]);
    expect(briefFailures({ ...brief, locale: "zh-SG" }, ["Trusted by 500 SG firms"], marketRules("SG"))).toEqual([]);
  });

  it("fails unsourced facts, unknown claims, a long answer and a wrong locale", () => {
    const out = briefFailures(
      {
        ...brief,
        locale: "en-GB",
        direct_answer: "word ".repeat(51),
        facts: [{ text: "Rates change by age", source_url: null }],
        internal_links_out: ["/a"],
      },
      [],
      marketRules("SG"),
    );
    expect(out).toEqual([
      "direct answer is 51 words (max 50)",
      "fact without a source: Rates change by age",
      "claim not in brain and not marked new: Trusted by 500 SG firms",
      "fewer than 3 internal links out",
      "locale en-GB not allowed for SG",
    ]);
  });

  it("counts open source markers", () => {
    expect(openSourceMarkers("A [SOURCE NEEDED] b [SOURCE NEEDED]")).toBe(2);
  });

  it("builds a system prompt with the brain, market and rules", () => {
    const { model, system } = buildSystemPrompt("search/brief_writer@1", { client_id: "c1", organization: { name: "Acme Payroll" } }, "GB", marketRules("GB"));
    expect(model).toBe("claude-opus-5-5");
    expect(system).toContain("Acme Payroll");
    expect(system).toContain('"currency":"GBP"');
    expect(system).not.toContain("{brain}");
    expect(system).not.toContain("{market_rules}");
  });
});
