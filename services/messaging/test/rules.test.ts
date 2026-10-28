import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dir } from "../src/paths.js";
import { EU_MEMBERS, MARKET_RULES_PATH, loadRulesFile, marketCodes, resolveMarket } from "../src/market-rules.js";
import { segmentInfo } from "../src/encoding.js";
import { classifyInbound } from "../src/keywords.js";
import { checkWindow, nextAllowed } from "../src/window.js";
import { checkCaps, type SentMessage } from "../src/caps.js";
import { chooseChannel } from "../src/channel.js";
import { splitAudience } from "../src/holdout.js";

const at = (iso: string) => new Date(iso);

describe("market rules", () => {
  it("is the file the engine compliance gate reads for sms, whatsapp and push", () => {
    const engine = JSON.parse(readFileSync(dir("..", "..", "engine", "specs", "compliance-rules.json"), "utf8"));
    for (const ch of ["sms", "whatsapp", "push"]) expect(engine.channel_overlays[ch]).toBe("services/messaging/market-rules.yaml");
    expect(MARKET_RULES_PATH.endsWith("services/messaging/market-rules.yaml")).toBe(true);
  });

  it("covers every launch market: UK, Singapore, US, Canada, the 6 GCC countries and the EU", () => {
    expect(marketCodes().sort()).toEqual(["AE", "BH", "CA", "EU", "GB", "KW", "OM", "QA", "SA", "SG", "US"]);
  });

  it("gives every market a window, opt-out words and the brand name and opt-out in every message", () => {
    for (const [code, m] of Object.entries(loadRulesFile().markets)) {
      expect(m.window.start < m.window.end, code).toBe(true);
      expect(m.optout_keywords, code).toContain("STOP");
      expect(m.required_in_message, code).toEqual(expect.arrayContaining(["brand_name", "optout_instruction"]));
      expect(Object.keys(m.consent).sort(), code).toEqual(["push", "sms", "whatsapp"]);
    }
  });

  it("maps an EU member state to the EU block with its own overrides", () => {
    expect(EU_MEMBERS).toHaveLength(27);
    const de = resolveMarket("DE");
    expect(de.market).toBe("EU");
    expect(de.languages).toEqual(["de"]);
    const fr = resolveMarket("fr");
    expect(fr.window).toEqual({ start: "08:00", end: "20:00", tz: "recipient_local" });
    expect(fr.quiet_days).toEqual(["Sunday", "public_holiday"]);
    expect(fr.verify).toBe(true);
    expect(resolveMarket("IT").window.start).toBe("09:00");
  });

  it("applies the stricter US state rules and the Quebec language rule", () => {
    const fl = resolveMarket("US", "US-FL");
    expect(fl.window.end).toBe("20:00");
    expect(fl.max_per_24h_same_topic).toBe(3);
    expect(fl.verify).toBe(true);
    expect(resolveMarket("US", "US-NY").window.end).toBe("21:00");
    expect(resolveMarket("CA", "CA-QC").required_language).toBe("fr-CA");
    expect(resolveMarket("CA", "CA-ON").required_language).toBeUndefined();
  });

  it("keeps the Singapore DNC freshness at 21 days and adds global opt-out words", () => {
    expect(resolveMarket("SG").dnc_valid_days).toBe(21);
    expect(resolveMarket("GB").optout_keywords).toEqual(expect.arrayContaining(["STOP", "UNSUBSCRIBE", "REVOKE"]));
  });

  it("refuses a country Pith does not serve and a subdivision of another country", () => {
    expect(() => resolveMarket("JP")).toThrow(/No messaging rules/);
    expect(() => resolveMarket("US", "CA-QC")).toThrow(/not in US/);
  });
});

describe("SMS encoding and segments", () => {
  it("counts GSM-7 at 160 for 1 segment and 153 after that", () => {
    expect(segmentInfo("a".repeat(160))).toMatchObject({ encoding: "GSM-7", segments: 1 });
    expect(segmentInfo("a".repeat(161)).segments).toBe(2);
    expect(segmentInfo("a".repeat(306)).segments).toBe(2);
    expect(segmentInfo("a".repeat(307)).segments).toBe(3);
  });

  it("counts extension characters as 2 septets", () => {
    expect(segmentInfo("€{}").units).toBe(6);
    expect(segmentInfo("€".repeat(80)).segments).toBe(1);
    expect(segmentInfo("€".repeat(81)).segments).toBe(2);
  });

  it("switches to UCS-2 at 70 and 67 for an emoji, Arabic or a curly quote", () => {
    expect(segmentInfo("a".repeat(69) + "’")).toMatchObject({ encoding: "UCS-2", segments: 1, unicode_chars: ["’"] });
    expect(segmentInfo("a".repeat(70) + "’").segments).toBe(2);
    expect(segmentInfo("🌙").units).toBe(2);
    expect(segmentInfo("مرحبا").encoding).toBe("UCS-2");
  });
});

describe("inbound keywords", () => {
  const gb = resolveMarket("GB");
  it("opts out on the whole-message words in any case, with punctuation", () => {
    for (const t of ["STOP", "stop", " Stop! ", "unsubscribe", "opt out"]) expect(classifyInbound(t, gb), t).toBe("opt_out");
  });

  it("knows the local words: ARRET and ARRÊT in Canada, Arabic in the GCC", () => {
    const ca = resolveMarket("CA");
    expect(classifyInbound("arrêt", ca)).toBe("opt_out");
    expect(classifyInbound("ARRET", ca)).toBe("opt_out");
    expect(classifyInbound("إلغاء", resolveMarket("AE"))).toBe("opt_out");
    expect(classifyInbound("توقف", resolveMarket("SA"))).toBe("opt_out");
  });

  it("opts out on the Stop promotions button in English and Arabic", () => {
    expect(classifyInbound("", gb, "Stop promotions")).toBe("opt_out");
    expect(classifyInbound("", resolveMarket("AE"), "إيقاف العروض")).toBe("opt_out");
  });

  it("answers HELP and START, and sends other wording to the chat agent", () => {
    expect(classifyInbound("help", gb)).toBe("help");
    expect(classifyInbound("START", gb)).toBe("opt_in");
    expect(classifyInbound("please stop texting me", gb)).toBe("other");
    expect(classifyInbound("", gb)).toBe("other");
  });
});

describe("send window", () => {
  it("allows UK marketing from 08:00 to 20:00 London time, end not included", () => {
    const gb = resolveMarket("GB");
    expect(checkWindow(gb, at("2026-11-02T19:59:00Z")).allowed).toBe(true);
    expect(checkWindow(gb, at("2026-11-02T20:00:00Z"))).toMatchObject({ allowed: false, reason: "outside_hours" });
    expect(checkWindow(gb, at("2026-11-02T07:59:00Z")).allowed).toBe(false);
  });

  it("never limits utility messages by the hour", () => {
    expect(checkWindow(resolveMarket("GB"), at("2026-11-02T03:00:00Z"), { purpose: "utility" }).allowed).toBe(true);
  });

  it("uses the contact's own zone in the US, with Florida ending at 20:00", () => {
    const t = at("2026-11-04T01:30:00Z"); // 20:30 in New York
    expect(checkWindow(resolveMarket("US"), t)).toEqual({ allowed: false, reason: "no_time_zone" });
    expect(checkWindow(resolveMarket("US", "US-NY"), t, { tz: "America/New_York" }).allowed).toBe(true);
    expect(checkWindow(resolveMarket("US", "US-FL"), t, { tz: "America/New_York" }).allowed).toBe(false);
  });

  it("keeps French Sundays and public holidays quiet and finds the next allowed time", () => {
    const fr = resolveMarket("FR");
    const opts = { tz: "Europe/Paris", holidays: ["2026-11-11"] };
    expect(checkWindow(fr, at("2026-11-01T09:00:00Z"), opts)).toMatchObject({ allowed: false, reason: "quiet_day" });
    expect(nextAllowed(fr, at("2026-11-01T09:00:00Z"), opts)?.toISOString()).toBe("2026-11-02T07:00:00.000Z");
    expect(checkWindow(fr, at("2026-11-11T10:00:00Z"), opts)).toMatchObject({ allowed: false, reason: "public_holiday" });
  });

  it("uses the shorter weekend hours in Canada", () => {
    const ca = resolveMarket("CA");
    expect(checkWindow(ca, at("2026-10-30T13:30:00Z"), { tz: "America/Toronto" }).allowed).toBe(true); // Fri 09:30
    expect(checkWindow(ca, at("2026-10-31T13:30:00Z"), { tz: "America/Toronto" }).allowed).toBe(false); // Sat 09:30
    expect(checkWindow(ca, at("2026-10-31T14:00:00Z"), { tz: "America/Toronto" }).allowed).toBe(true); // Sat 10:00
  });

  it("pauses Saudi broadcasts at prayer times, not triggered messages", () => {
    const sa = resolveMarket("SA");
    const prayer_times = [{ from: at("2026-11-02T08:50:00Z"), to: at("2026-11-02T09:20:00Z") }];
    const t = at("2026-11-02T09:00:00Z");
    expect(checkWindow(sa, t, { kind: "broadcast", prayer_times })).toMatchObject({ allowed: false, reason: "prayer_time" });
    expect(checkWindow(sa, t, { kind: "triggered", prayer_times }).allowed).toBe(true);
    expect(nextAllowed(sa, t, { kind: "broadcast", prayer_times })?.toISOString()).toBe("2026-11-02T09:30:00.000Z");
  });

  it("moves a late UK send to 08:00 the next day, and gives up without a time zone", () => {
    expect(nextAllowed(resolveMarket("GB"), at("2026-11-02T22:00:00Z"))?.toISOString()).toBe("2026-11-03T08:00:00.000Z");
    expect(nextAllowed(resolveMarket("US"), at("2026-11-02T22:00:00Z"))).toBeUndefined();
  });
});

describe("frequency caps", () => {
  const now = at("2026-11-10T12:00:00Z");
  const ago = (h: number) => new Date(now.getTime() - h * 3600_000);
  const sms = (h: number, topic?: string): SentMessage => ({ channel: "sms", purpose: "marketing", sent_at: ago(h), topic });

  it("allows 1 marketing SMS per day and 4 per 30 days", () => {
    expect(checkCaps([sms(2)], { channel: "sms", purpose: "marketing" }, now).allowed).toBe(false);
    expect(checkCaps([sms(25)], { channel: "sms", purpose: "marketing" }, now).allowed).toBe(true);
    expect(checkCaps([sms(30), sms(100), sms(200), sms(300)], { channel: "sms", purpose: "marketing" }, now).allowed).toBe(false);
    expect(checkCaps([sms(30), sms(100), sms(200), sms(24 * 31)], { channel: "sms", purpose: "marketing" }, now).allowed).toBe(true);
  });

  it("caps push at 5 per week, and never caps utility messages", () => {
    const push = [30, 50, 80, 100, 130].map((h): SentMessage => ({ channel: "push", purpose: "marketing", sent_at: ago(h) }));
    expect(checkCaps(push, { channel: "push", purpose: "marketing" }, now)).toMatchObject({ allowed: false });
    expect(checkCaps([sms(1), sms(2)], { channel: "sms", purpose: "utility" }, now).allowed).toBe(true);
  });

  it("applies the Florida limit of 3 messages on 1 topic in 24 h across channels", () => {
    const wa = [1, 2, 3].map((h): SentMessage => ({ channel: "whatsapp", purpose: "marketing", sent_at: ago(h), topic: "sale" }));
    const fl = resolveMarket("US", "US-FL");
    const r = checkCaps(wa, { channel: "sms", purpose: "marketing", topic: "sale" }, now, fl);
    expect(r).toEqual({ allowed: false, reason: "US-FL limit 3 per 24 h on 1 topic reached" });
    expect(checkCaps(wa, { channel: "sms", purpose: "marketing", topic: "new_menu" }, now, fl).allowed).toBe(true);
  });
});

describe("channel waterfall", () => {
  const gb = { country: "GB", consents: { push: "granted", whatsapp: "granted", sms: "granted" }, push_tokens: [{ platform: "ios", token: "t" }] };
  const now = at("2026-11-10T12:00:00Z");

  it("uses push first, and skips push for a critical message", () => {
    expect(chooseChannel(gb, { purpose: "marketing" }, now).channel).toBe("push");
    expect(chooseChannel(gb, { purpose: "utility", critical: true }, now)).toMatchObject({ channel: "whatsapp", whatsapp_mode: "template", sms_fallback_after_minutes: 10 });
  });

  it("uses free text on WhatsApp only inside the 24 h window, and SMS fallback only for utility", () => {
    const c = { ...gb, push_tokens: [], whatsapp_window_open_until: "2026-11-10T15:00:00Z" };
    expect(chooseChannel(c, { purpose: "marketing" }, now)).toEqual({ channel: "whatsapp", whatsapp_mode: "free_form", reason: expect.any(String) });
  });

  it("uses SMS in the US and Canada, then email, then nothing", () => {
    const us = { country: "US", consents: { whatsapp: "granted", sms: "granted" } };
    expect(chooseChannel(us, { purpose: "marketing" }, now).channel).toBe("sms");
    expect(chooseChannel({ country: "CA", consents: { sms: "withdrawn", email: "granted" } }, { purpose: "marketing" }, now).channel).toBe("email");
    expect(chooseChannel({ country: "DE", consents: {} }, { purpose: "marketing" }, now).channel).toBe("none");
  });
});

describe("broadcast holdout and test cells", () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `c${i}`);

  it("holds out 10%, then sends 20% of the rest as A and B", () => {
    const s = splitAudience(ids(20000), "bc-1");
    expect(s.holdout).toHaveLength(2000);
    expect(s.test_cells.A).toHaveLength(1800);
    expect(s.test_cells.B).toHaveLength(1800);
    expect(s.rest).toHaveLength(14400);
    expect(new Set([...s.holdout, ...s.test_cells.A, ...s.test_cells.B, ...s.rest]).size).toBe(20000);
  });

  it("holds out at least 1000, but never more than half", () => {
    expect(splitAudience(ids(5000), "bc-1").holdout).toHaveLength(1000);
    expect(splitAudience(ids(1500), "bc-1").holdout).toHaveLength(750);
  });

  it("gives the same split for the same seed, and another split for another seed", () => {
    expect(splitAudience(ids(3000), "bc-1")).toEqual(splitAudience(ids(3000).reverse(), "bc-1"));
    expect(splitAudience(ids(3000), "bc-2").holdout).not.toEqual(splitAudience(ids(3000), "bc-1").holdout);
  });
});
