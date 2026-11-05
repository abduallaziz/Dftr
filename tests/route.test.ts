import { describe, expect, it } from "vitest";
import { tokenFromPath } from "../src/utils/route";

const T = "Ab3_-".repeat(9); // 45 chars
describe("tokenFromPath", () => {
  it("accepts only /<long token>", () => {
    expect(tokenFromPath(`/${T}`)).toBe(T);
    expect(tokenFromPath(`/${T}/`)).toBe(T);
  });
  it("rejects role-word paths, short tokens, nested paths, root", () => {
    for (const p of ["/", "/employee", `/employee/${T}`, `/accountant/${T}`, "/short", `/${T}/x`, "/admin"]) {
      expect(tokenFromPath(p), p).toBeNull();
    }
  });
});
