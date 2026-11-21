import { describe, expect, it } from "vitest";
import { parseExpense, parseExpensePatch, parseNewExpense, parsePaymentMethod } from "../supabase/functions/_shared/validation.ts";

const KEY = "6f1c2a3e-1b2c-4d5e-8f90-a1b2c3d4e5f6";
describe("payment method", () => {
  it("defaults to cash when missing", () => {
    expect(parsePaymentMethod(undefined)).toEqual({ ok: true, value: "cash" });
    const r = parseExpense({ category_id: "soap", amount: 10, client_key: KEY });
    expect(r.ok && r.value.payment_method).toBe("cash");
  });
  it("accepts card and cash, rejects anything else", () => {
    const card = parseExpense({ category_id: "soap", amount: 10, client_key: KEY, payment_method: "card" });
    expect(card.ok && card.value.payment_method).toBe("card");
    for (const bad of ["credit", "CARD", "", 1, true, {}]) expect(parseExpense({ category_id: "soap", amount: 10, client_key: KEY, payment_method: bad }).ok, String(bad)).toBe(false);
  });
  it("the owner can change only the method of an expense, and add expenses with a method", () => {
    expect(parseExpensePatch({ id: 3, payment_method: "card" }).ok).toBe(true);
    expect(parseExpensePatch({ id: 3, payment_method: "x" }).ok).toBe(false);
    const n = parseNewExpense({ date: "2025-03-01", category_id: "soap", amount: 4, payment_method: "card" });
    expect(n.ok && n.value.payment_method).toBe("card");
    const d = parseNewExpense({ date: "2025-03-01", category_id: "soap", amount: 4 });
    expect(d.ok && d.value.payment_method).toBe("cash");
  });
});
