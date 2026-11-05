import type { Role } from "../types";
import { ApiError, callApi } from "./api";

/** Asks each API whether it accepts the token. Returns null for an unknown token. */
export async function resolveRole(token: string): Promise<Role | null> {
  for (const [fn, role] of [["employee-api", "employee"], ["accountant-api", "accountant"]] as const) {
    try {
      await callApi<{ ok: true }>(fn, token, { action: "ping" });
      return role;
    } catch (e) {
      if (e instanceof ApiError && e.code === "unauthorized") continue;
      throw e;
    }
  }
  return null;
}
