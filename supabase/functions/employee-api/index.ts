import { adminClient } from "../_shared/db.ts";
import { tokenMatches } from "../_shared/auth.ts";
import { corsHeaders, errorResponse, json, readJson } from "../_shared/http.ts";
import { parseDailyUpdate, parseExpense } from "../_shared/validation.ts";

const EXPENSE_COLUMNS = "id, category_id, amount, created_at, report_date";
const DAILY_COLUMNS = "report_date, employee_total_cars, free_large, free_small, mada, visa, mastercard, cash";

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return errorResponse(req, "method_not_allowed", 405);

  // Server-side authorization: only the EMPLOYEE token is accepted here.
  if (!(await tokenMatches(req.headers.get("x-access-token"), "EMPLOYEE_ACCESS_TOKEN"))) {
    return errorResponse(req, "unauthorized", 401);
  }

  const body = await readJson(req);
  if (!body) return errorResponse(req, "bad_request", 400);

  try {
    const db = adminClient();
    const { data: today, error: todayErr } = await db.rpc("riyadh_today");
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
        return json(req, { date: today, categories: cats.data, daily: daily.data, expenses: expenses.data });
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
        const { data, error } = await db.from("daily_reports")
          .upsert({ report_date: today, ...input.value, updated_at: new Date().toISOString() }, { onConflict: "report_date" })
          .select(DAILY_COLUMNS).single();
        if (error) throw error;
        return json(req, { daily: data });
      }

      default:
        return errorResponse(req, "unknown_action", 400);
    }
  } catch (e) {
    console.error("employee-api error", e instanceof Error ? e.message : e);
    return errorResponse(req, "server_error", 500);
  }
});
