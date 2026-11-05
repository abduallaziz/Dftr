import { describe, expect, it } from "vitest";
import { parseTotalCars } from "../supabase/functions/_shared/validation.ts";
import { actualCars } from "../src/utils/cars";

describe("parseTotalCars", () => {
  it("accepts valid", () => expect(parseTotalCars({ date: "2025-03-01", total_cars: 40 }).ok).toBe(true));
  it("rejects invalid", () => {
    expect(parseTotalCars({ date: "2025-03-01", total_cars: -1 }).ok).toBe(false);
    expect(parseTotalCars({ date: "2025-03-01", total_cars: 1.5 }).ok).toBe(false);
    expect(parseTotalCars({ date: "bad", total_cars: 1 }).ok).toBe(false);
  });
});

describe("actualCars", () => {
  it("is total minus free", () => expect(actualCars(40, 3, 2)).toBe(35));
  it("is null when total not recorded", () => expect(actualCars(null, 3, 2)).toBeNull());
  it("treats missing free report as 0", () => expect(actualCars(10, null, null)).toBe(10));
});
