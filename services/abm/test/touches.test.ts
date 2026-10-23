import { describe, expect, it } from "vitest";
import { WEEKLY_TOUCH_CAP, localWeekday, touchBlocks } from "../src/touches.js";

describe("touch rules", () => {
  it("caps touches per contact per week by tier", () => {
    expect(WEEKLY_TOUCH_CAP).toEqual({ 1: 2, 2: 1, 3: 1 });
    const at = new Date("2026-10-20T10:00:00Z"); // Tuesday, 11:00 in London
    const base = { at, timeZone: "Europe/London", accountCountry: "GB" };
    expect(touchBlocks({ ...base, tier: 1, touchesLast7Days: 1 })).toEqual([]);
    expect(touchBlocks({ ...base, tier: 1, touchesLast7Days: 2 })).toEqual(["weekly_cap"]);
    expect(touchBlocks({ ...base, tier: 3, touchesLast7Days: 1 })).toEqual(["weekly_cap"]);
  });

  it("uses the Friday and Saturday weekend in Saudi Arabia and the GCC countries that inherit it", () => {
    const friday = new Date("2026-10-23T08:00:00Z");
    expect(localWeekday(friday, "Asia/Riyadh")).toBe("FRI");
    for (const c of ["SA", "QA", "KW", "BH", "OM"]) {
      expect(touchBlocks({ at: friday, timeZone: "Asia/Riyadh", accountCountry: c, tier: 2, touchesLast7Days: 0 })).toContain("local_weekend");
    }
    expect(touchBlocks({ at: friday, timeZone: "Asia/Dubai", accountCountry: "AE", tier: 2, touchesLast7Days: 0 })).toEqual([]);
  });

  it("keeps US touches inside the 09:00 to 11:00 window in the contact's time zone", () => {
    const base = { accountCountry: "US", timeZone: "America/New_York", tier: 2 as const, touchesLast7Days: 0 };
    expect(touchBlocks({ ...base, at: new Date("2026-10-20T13:30:00Z") })).toEqual([]); // 09:30 EDT
    expect(touchBlocks({ ...base, at: new Date("2026-10-20T15:00:00Z") })).toEqual(["outside_send_window"]); // 11:00 EDT
  });

  it("holds first cold touches in Ramadan in the GCC only", () => {
    const at = new Date("2026-10-20T08:00:00Z");
    expect(touchBlocks({ at, timeZone: "Asia/Dubai", accountCountry: "AE", tier: 1, touchesLast7Days: 0, ramadan: true, firstTouch: true })).toEqual(["ramadan_cold_touch"]);
    expect(touchBlocks({ at, timeZone: "Asia/Dubai", accountCountry: "AE", tier: 1, touchesLast7Days: 0, ramadan: true, firstTouch: false })).toEqual([]);
    expect(touchBlocks({ at: new Date("2026-10-20T10:00:00Z"), timeZone: "Europe/London", accountCountry: "GB", tier: 1, touchesLast7Days: 0, ramadan: true, firstTouch: true })).toEqual([]);
  });
});
