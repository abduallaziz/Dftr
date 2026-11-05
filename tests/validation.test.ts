import { describe, expect, it } from "vitest";
import { parseDailyUpdate, parseExpense, parseList, parseMoney, parseRange } from "../supabase/functions/_shared/validation.ts";

const KEY = "6f1c2a3e-1b2c-4d5e-8f90-a1b2c3d4e5f6";

describe("parseMoney", () => {
  it("accepts positive decimals up to 2 places", () => {
    expect(parseMoney(12.5, { allowZero: false })).toEqual({ ok: true, value: 12.5 });
    expect(parseMoney("12.50", { allowZero: false })).toEqual({ ok: true, value: 12.5 });
  });
  it("rejects zero, negative, NaN, 3 decimals, huge, text", () => {
    for (const v of [0, -1, NaN, Infinity, 1.234, 1e9, "abc", "", null, undefined, "1e3"]) {
      expect(parseMoney(v, { allowZero: false }).ok).toBe(false);
    }
  });
  it("allows zero when requested", () => expect(parseMoney(0, { allowZero: true }).ok).toBe(true));
});

describe("parseExpense", () => {
  it("accepts a valid expense", () => {
    expect(parseExpense({ category_id: "soap", amount: 10, client_key: KEY }).ok).toBe(true);
  });
  it("rejects bad category / amount / key", () => {
    expect(parseExpense({ category_id: "SOAP; drop", amount: 10, client_key: KEY }).ok).toBe(false);
    expect(parseExpense({ category_id: "soap", amount: 0, client_key: KEY }).ok).toBe(false);
    expect(parseExpense({ category_id: "soap", amount: -5, client_key: KEY }).ok).toBe(false);
    expect(parseExpense({ category_id: "soap", amount: 5, client_key: "nope" }).ok).toBe(false);
  });
});

describe("parseDailyUpdate", () => {
  it("accepts partial updates and zero", () => {
    expect(parseDailyUpdate({ free_large: 0, free_small: 3 })).toEqual({ ok: true, value: { free_large: 0, free_small: 3 } });
    expect(parseDailyUpdate({ cash: 10.25, mada: 0 }).ok).toBe(true);
  });
  it("rejects negatives, decimals for counts, empty", () => {
    expect(parseDailyUpdate({ free_large: -1 }).ok).toBe(false);
    expect(parseDailyUpdate({ free_small: 1.5 }).ok).toBe(false);
    expect(parseDailyUpdate({ visa: -2 }).ok).toBe(false);
    expect(parseDailyUpdate({}).ok).toBe(false);
  });
  it("ignores unknown fields (cannot set report_date)", () => {
    expect(parseDailyUpdate({ report_date: "2020-01-01", cash: 1 })).toEqual({ ok: true, value: { cash: 1 } });
  });
});

describe("ranges and lists", () => {
  it("validates dates and order", () => {
    expect(parseRange({ from: "2025-02-30", to: "2025-03-01" }).ok).toBe(false);
    expect(parseRange({ from: "2025-03-02", to: "2025-03-01" }).ok).toBe(false);
    expect(parseRange({ from: "2025-03-01", to: "2025-03-31" }).ok).toBe(true);
  });
  it("validates sort/pagination", () => {
    const base = { from: "2025-03-01", to: "2025-03-31" };
    expect(parseList({ ...base, sort: "amount", dir: "asc", limit: 20, offset: 0 }).ok).toBe(true);
    expect(parseList({ ...base, sort: "x" }).ok).toBe(false);
    expect(parseList({ ...base, limit: 1000 }).ok).toBe(false);
    expect(parseList({ ...base, offset: -1 }).ok).toBe(false);
  });
});

import { parseCategory, parseDayEdit, parseExpensePatch, parseNewExpense } from "../supabase/functions/_shared/validation.ts";
describe("admin validation", () => {
  it("expense patch needs a valid change", () => {
    expect(parseExpensePatch({ id: 3, amount: 5 }).ok).toBe(true);
    expect(parseExpensePatch({ id: 3 }).ok).toBe(false);
    expect(parseExpensePatch({ id: 0, amount: 5 }).ok).toBe(false);
    expect(parseExpensePatch({ id: 3, amount: -1 }).ok).toBe(false);
  });
  it("new expense", () => {
    expect(parseNewExpense({ date: "2025-03-01", category_id: "soap", amount: 4.5 }).ok).toBe(true);
    expect(parseNewExpense({ date: "2025-13-01", category_id: "soap", amount: 4.5 }).ok).toBe(false);
  });
  it("day edit supports clearing counts with null", () => {
    expect(parseDayEdit({ date: "2025-03-01", daily: { employee_total_cars: null }, total_cars: null })).toEqual({
      ok: true, value: { date: "2025-03-01", daily: { employee_total_cars: null }, total_cars: null },
    });
    expect(parseDayEdit({ date: "2025-03-01", daily: { cash: 5, free_large: 2 }, total_cars: 30 }).ok).toBe(true);
    expect(parseDayEdit({ date: "2025-03-01", daily: { cash: -5 } }).ok).toBe(false);
    expect(parseDayEdit({ date: "2025-03-01" }).ok).toBe(false);
  });
  it("category", () => {
    const ok = { id: "wax", name_ar: "شمع", name_en: "Wax", name_bn: "ওয়াক্স", icon: "Sparkles", is_active: true, sort_order: 9, create: true };
    expect(parseCategory(ok).ok).toBe(true);
    expect(parseCategory({ ...ok, icon: "Evil" }).ok).toBe(false);
    expect(parseCategory({ ...ok, id: "Bad Id" }).ok).toBe(false);
  });
});

import { parseSetting } from "../supabase/functions/_shared/validation.ts";
describe("parseSetting", () => {
  it("accepts only the known key with a boolean", () => {
    expect(parseSetting({ key: "show_payments_to_accountant", value: false }).ok).toBe(true);
    expect(parseSetting({ key: "other", value: true }).ok).toBe(false);
    expect(parseSetting({ key: "show_payments_to_accountant", value: "no" }).ok).toBe(false);
  });
});
