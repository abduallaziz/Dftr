export class ApiError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
  }
}

const BASE = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, "");

/** POSTs to a Supabase Edge Function. The access token travels in a header, never in the query string. */
export async function callApi<T>(fn: "employee-api" | "accountant-api" | "admin-api", token: string, body: Record<string, unknown>): Promise<T> {
  if (!BASE) throw new ApiError("config", 0);
  let res: Response;
  try {
    res = await fetch(`${BASE}/functions/v1/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-access-token": token },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("network", 0);
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response
  }
  if (!res.ok) {
    const code =
      typeof data === "object" && data !== null && "error" in data && typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : "server";
    throw new ApiError(res.status === 401 ? "unauthorized" : code, res.status);
  }
  return data as T;
}
