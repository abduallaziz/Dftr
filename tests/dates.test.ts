import { describe, expect, it } from "vitest";
import { addMonths, rangeFor, riyadhToday, shiftAnchor } from "../src/utils/dates";

describe("riyadhToday", () => {
  it("uses Asia/Riyadh (UTC+3) day boundaries, not UTC", () => {
    expect(riyadhToday(new Date("2025-03-01T20:59:59Z"))).toBe("2025-03-01"); // 23:59:59 Riyadh
    expect(riyadhToday(new Date("2025-03-01T21:00:00Z"))).toBe("2025-03-02"); // 00:00 Riyadh
  });
});

describe("rangeFor", () => {
  it("daily", () => expect(rangeFor("daily", "2025-03-05")).toEqual({ from: "2025-03-05", to: "2025-03-05" }));
  it("weekly runs Sunday-Saturday", () => {
    // 2025-03-05 is a Wednesday
    expect(rangeFor("weekly", "2025-03-05")).toEqual({ from: "2025-03-02", to: "2025-03-08" });
    expect(rangeFor("weekly", "2025-03-02")).toEqual({ from: "2025-03-02", to: "2025-03-08" });
    expect(rangeFor("weekly", "2025-03-08")).toEqual({ from: "2025-03-02", to: "2025-03-08" });
  });
  it("monthly handles month ends and leap years", () => {
    expect(rangeFor("monthly", "2025-02-14")).toEqual({ from: "2025-02-01", to: "2025-02-28" });
    expect(rangeFor("monthly", "2024-02-14")).toEqual({ from: "2024-02-01", to: "2024-02-29" });
    expect(rangeFor("monthly", "2025-12-31")).toEqual({ from: "2025-12-01", to: "2025-12-31" });
  });
  it("yearly", () => expect(rangeFor("yearly", "2025-06-15")).toEqual({ from: "2025-01-01", to: "2025-12-31" }));
});

describe("shiftAnchor", () => {
  it("moves across month/year boundaries", () => {
    expect(shiftAnchor("daily", "2025-03-01", -1)).toBe("2025-02-28");
    expect(shiftAnchor("weekly", "2025-01-03", -1)).toBe("2024-12-27");
    expect(shiftAnchor("monthly", "2025-03-31", -1)).toBe("2025-02-28");
    expect(shiftAnchor("yearly", "2024-02-29", 1)).toBe("2025-02-28");
    expect(addMonths("2025-01-31", 1)).toBe("2025-02-28");
  });
});
