import { describe, expect, it } from "vitest";
import ar from "../src/i18n/locales/ar.json";
import bn from "../src/i18n/locales/bn.json";
import en from "../src/i18n/locales/en.json";
import { DIRECTION, translate } from "../src/i18n";
import { formatSar, parseAmountInput, parsePaymentInput } from "../src/utils/format";

const placeholders = (s: string): string[] => (s.match(/\{\w+\}/g) ?? []).sort();

describe("locales", () => {
  it("have identical keys and placeholders", () => {
    const keys = Object.keys(en).sort();
    for (const [name, dict] of [["ar", ar], ["bn", bn]] as const) {
      expect(Object.keys(dict).sort(), name).toEqual(keys);
      for (const k of keys) {
        expect(placeholders((dict as Record<string, string>)[k] ?? ""), `${name}:${k}`).toEqual(placeholders((en as Record<string, string>)[k] ?? ""));
        expect(((dict as Record<string, string>)[k] ?? "").trim(), `${name}:${k}`).not.toBe("");
      }
    }
  });
  it("directions", () => {
    expect(DIRECTION).toEqual({ ar: "rtl", en: "ltr", bn: "ltr" });
  });
  it("interpolates", () => expect(translate("en", "common.entries", { count: 3 })).toBe("3 entries"));
});

describe("formatting and input parsing", () => {
  it("formats SAR", () => {
    expect(formatSar(1234.5, "en")).toContain("1,234.50");
    expect(formatSar(1234.5, "ar")).toContain("1,234.50");
  });
  it("parses amounts", () => {
    expect(parseAmountInput("12,5")).toBe(12.5);
    expect(parseAmountInput("0")).toBeNull();
    expect(parseAmountInput("-3")).toBeNull();
    expect(parseAmountInput("1.234")).toBeNull();
    expect(parsePaymentInput("")).toBe(0);
    expect(parsePaymentInput("0")).toBe(0);
    expect(parsePaymentInput("x")).toBeNull();
  });
});
