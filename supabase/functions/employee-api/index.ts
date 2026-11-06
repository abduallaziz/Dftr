import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { adminClient } from "../_shared/db.ts";
import { tokenMatches } from "../_shared/auth.ts";
import { corsHeaders, errorResponse, json, readJson } from "../_shared/http.ts";
import { parseDailyUpdate, parseExpense } from "../_shared/validation.ts";

const EXPENSE_COLUMNS = "id, category_id, amount, created_at, report_date, client_key";
const DAILY_COLUMNS = "report_date, employee_total_cars, free_large, free_small, mada, visa, mastercard, cash";

/** The accountant's count is revealed to the employee only after the employee has saved their own. */
async function accountantCountFor(db: SupabaseClient, date: string, employeeCount: number | null | undefined): Promise<number | null> {
  if (employeeCount === null || employeeCount === undefined) return null;
  const { data, error } = await db.from("daily_totals").select("total_cars").eq("report_date", date).maybeSingle();
  if (error) throw error;
  return data?.total_cars ?? null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return errorResponse(req, "method_not_allowed", 405);

  // Server-side authorization: only the EMPLOYEE token is accepted here.
  if (!(await tokenMatches(req.headers.get("x-access-token"), "EMPLOYEE_ACCESS_TOKEN"))) {
    return errorResponse(req, "unauthorized", 401);
  }

  const body = await readJson(req);
  if (!body) return errorResponse(req, "bad_request", 400);

  if (body.action === "ping") return json(req, { ok: true }); // token already verified above

  try {
    const db = adminClient();
    const { data: today, error: todayErr } = await db.rpc("business_today");
    if (todayErr || typeof today !== "string") throw todayErr ?? new Error("no_date");

    switch (body.action) {
      case "get_today": {
        const [cats, daily, expenses] = await Promise.all([
          db.from("expense_categories").select("id, name_ar, name_en, name_bn, icon, sort_order")
            .eq("is_active", true).order("sort_order"),
          db.from("daily_reports").select(DAILY_COLUMNS).eq("report_date", today).maybeSingle(),
          db.from("expenses").select(EXPENSE_COLUMNS).eq("report_date", today).order("created_at", { ascending: false }).limit(500),
        ]);
        if (cats.error || daily.error || expenses.error) throw cats.error ?? daily.error ?? expenses.error;
        const accountant_total_cars = await accountantCountFor(db, today, daily.data?.employee_total_cars);
        return json(req, { date: today, categories: cats.data, daily: daily.data, expenses: expenses.data, accountant_total_cars });
      }

      case "submit_expense": {
        const input = parseExpense(body);
        if (!input.ok) return errorResponse(req, input.error, 400);
        const { data: cat, error: catErr } = await db.from("expense_categories")
          .select("id").eq("id", input.value.category_id).eq("is_active", true).maybeSingle();
        if (catErr) throw catErr;
        if (!cat) return errorResponse(req, "invalid_category", 400);

        const { data, error } = await db.from("expenses").insert({
          category_id: input.value.category_id,
          amount: input.value.amount,
          report_date: today, // business day (continues past midnight until the owner's cutoff hour)
          client_key: input.value.client_key,
          // report_date and created_at are assigned by the database (Asia/Riyadh / server clock).
        }).select(EXPENSE_COLUMNS).single();

        if (error?.code === "23505") {
          // Same client_key already stored: a retry or double tap. Return the original row.
          const { data: existing, error: exErr } = await db.from("expenses")
            .select(EXPENSE_COLUMNS).eq("client_key", input.value.client_key).single();
          if (exErr) throw exErr;
          return json(req, { expense: existing, duplicate: true });
        }
        if (error) throw error;
        return json(req, { expense: data, duplicate: false });
      }

      case "save_daily": {
        const input = parseDailyUpdate(body);
        if (!input.ok) return errorResponse(req, input.error, 400);
        if (input.value.employee_total_cars !== undefined) {
          // The employee's count is final once saved; only the owner can change it.
          const { data: cur, error: curErr } = await db.from("daily_reports")
            .select("employee_total_cars").eq("report_date", today).maybeSingle();
          if (curErr) throw curErr;
          if (cur?.employee_total_cars !== null && cur?.employee_total_cars !== undefined) {
            return errorResponse(req, "employee_count_locked", 409);
          }
        }
        const { data, error } = await db.from("daily_reports")
          .upsert({ report_date: today, ...input.value, updated_at: new Date().toISOString() }, { onConflict: "report_date" })
          .select(DAILY_COLUMNS).single();
        if (error) throw error;
        return json(req, { daily: data, accountant_total_cars: await accountantCountFor(db, today, data.employee_total_cars) });
      }

      default:
        return errorResponse(req, "unknown_action", 400);
    }
  } catch (e) {
    console.error("employee-api error", e instanceof Error ? e.message : e);
    return errorResponse(req, "server_error", 500);
  }
});
