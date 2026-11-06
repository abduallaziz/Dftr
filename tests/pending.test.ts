import { beforeEach, describe, expect, it } from "vitest";
import { MAX_AGE_MS, LEGACY_REUSE_MS, isUnknownOutcome, loadPending, pendingFor, reconcile, rememberAttempt, settleAttempt, type PendingAttempt } from "../src/services/pendingExpenses";
import type { Expense } from "../src/types";

class MemStore { m = new Map<string,string>(); getItem(k:string){return this.m.get(k)??null} setItem(k:string,v:string){this.m.set(k,v)} removeItem(k:string){this.m.delete(k)} }
const exp = (key: string | undefined, id = 1): Expense => ({ id, category_id: "soap", amount: 10, created_at: "2026-11-05T10:00:00Z", ...(key ? { client_key: key } : {}) });
const att = (key: string, at = Date.now(), category_id = "soap", amount = 10): PendingAttempt => ({ key, category_id, amount, at });

beforeEach(() => { (globalThis as unknown as { localStorage: MemStore }).localStorage = new MemStore(); });

describe("pending attempts storage", () => {
  it("remembers, finds by category and settles", () => {
    rememberAttempt(att("k1")); rememberAttempt(att("k2", Date.now(), "gas"));
    expect(pendingFor("soap")?.key).toBe("k1"); expect(pendingFor("gas")?.key).toBe("k2");
    settleAttempt("k1"); expect(pendingFor("soap")).toBeUndefined(); expect(pendingFor("gas")?.key).toBe("k2");
  });
  it("updating the same attempt replaces it (amount corrected before retry)", () => {
    rememberAttempt(att("k1", Date.now(), "soap", 10)); rememberAttempt(att("k1", Date.now(), "soap", 12));
    expect(loadPending()).toHaveLength(1); expect(pendingFor("soap")?.amount).toBe(12);
  });
  it("drops attempts older than a business day", () => {
    rememberAttempt(att("old", Date.now() - MAX_AGE_MS - 1)); expect(pendingFor("soap")).toBeUndefined();
  });
  it("survives a corrupted store and an unavailable store", () => {
    localStorage.setItem("carwash.pendingExpenses.v1", "{not json"); expect(loadPending()).toEqual([]);
    (globalThis as unknown as { localStorage: unknown }).localStorage = { getItem(){throw new Error("denied")}, setItem(){throw new Error("denied")} };
    rememberAttempt(att("m1")); expect(pendingFor("soap")?.key).toBe("m1"); // in-memory fallback
  });
});

describe("reconcile when the employee reopens a category", () => {
  const now = Date.now();
  it("nothing pending -> fresh", () => expect(reconcile(undefined, [], now)).toEqual({ action: "fresh" }));
  it("server has the key -> already saved (attempt settled, a NEW entry needs a new key)", () => {
    const r = reconcile(att("k1", now - 1000), [exp("k1", 7)], now); expect(r.action).toBe("already-saved");
  });
  it("server shows keys but not this one -> verified NOT saved -> retry with the SAME key", () => {
    const p = att("k1", now - 3 * 60 * 60 * 1000); expect(reconcile(p, [exp("other")], now)).toEqual({ action: "retry", attempt: p });
  });
  it("empty day on the server -> not saved -> retry same key", () => { const p = att("k1", now - 1000); expect(reconcile(p, [], now).action).toBe("retry"); });
  it("server unreachable -> reuse the key only for a short window", () => {
    expect(reconcile(att("k1", now - 60_000), null, now).action).toBe("retry");
    expect(reconcile(att("k1", now - LEGACY_REUSE_MS - 1), null, now).action).toBe("fresh");
  });
  it("old server (no keys returned) -> short window only, so a later real entry is never swallowed", () => {
    expect(reconcile(att("k1", now - 60_000), [exp(undefined)], now).action).toBe("retry");
    expect(reconcile(att("k1", now - LEGACY_REUSE_MS - 1), [exp(undefined)], now).action).toBe("fresh");
  });
  it("two genuine same-amount entries: after the first settles there is nothing pending -> second gets its own key", () => {
    rememberAttempt(att("k1")); settleAttempt("k1"); expect(reconcile(pendingFor("soap"), [exp("k1")], now).action).toBe("fresh");
  });
});

describe("outcome classification", () => {
  it("no answer or server error = unknown; a rejection = settled", () => {
    expect(isUnknownOutcome(0)).toBe(true); expect(isUnknownOutcome(500)).toBe(true); expect(isUnknownOutcome(503)).toBe(true);
    expect(isUnknownOutcome(400)).toBe(false); expect(isUnknownOutcome(401)).toBe(false); expect(isUnknownOutcome(409)).toBe(false);
  });
});
