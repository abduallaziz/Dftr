import { adminClient } from "../_shared/db.ts";
import { tokenMatches } from "../_shared/auth.ts";
import { corsHeaders, errorResponse, json, readJson } from "../_shared/http.ts";
import { isValidDate, parseList, parseRange, parseTotalCars } from "../_shared/validation.ts";

// Read-only API, with ONE narrow write: the accountant records total cars per day (table daily_totals).
// It never touches employee records (expenses, daily_reports).
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return errorResponse(req, "method_not_allowed", 405);

  // Server-side authorization: only the ACCOUNTANT token is accepted here.
  if (!(await tokenMatches(req.headers.get("x-access-token"), "ACCOUNTANT_ACCESS_TOKEN"))) {
    return errorResponse(req, "unauthorized", 401);
  }

  const body = await readJson(req);
  if (!body) return errorResponse(req, "bad_request", 400);

  try {
    const db = adminClient();

    switch (body.action) {
      case "categories": {
        const { data, error } = await db.from("expense_categories")
          .select("id, name_ar, name_en, name_bn, icon, is_active, sort_order").order("sort_order");
        if (error) throw error;
        return json(req, { categories: data });
      }

      case "summary": {
        const r = parseRange(body);
        if (!r.ok) return errorResponse(req, r.error, 400);
        const { data, error } = await db.rpc("report_summary", { p_from: r.value.from, p_to: r.value.to });
        if (error) throw error;
        return json(req, { summary: data });
      }

      case "daily": {
        const r = parseList(body);
        if (!r.ok) return errorResponse(req, r.error, 400);
        const { data, error } = await db.rpc("report_daily", {
          p_from: r.value.from, p_to: r.value.to, p_sort: r.value.sort,
          p_dir: r.value.dir, p_limit: r.value.limit, p_offset: r.value.offset,
        });
        if (error) throw error;
        return json(req, data);
      }

      case "day_entries": {
        if (!isValidDate(body.date)) return errorResponse(req, "invalid_date", 400);
        const { data, error } = await db.from("expenses")
          .select("id, category_id, amount, created_at").eq("report_date", body.date)
          .order("created_at", { ascending: true }).limit(1000);
        if (error) throw error;
        return json(req, { entries: data });
      }

      case "set_total_cars": {
        const r = parseTotalCars(body);
        if (!r.ok) return errorResponse(req, r.error, 400);
        const { data: today, error: tErr } = await db.rpc("riyadh_today");
        if (tErr || typeof today !== "string") throw tErr ?? new Error("no_date");
        if (r.value.date > today) return errorResponse(req, "invalid_date", 400);
        const { data, error } = await db.from("daily_totals")
          .upsert({ report_date: r.value.date, total_cars: r.value.total_cars, updated_at: new Date().toISOString() }, { onConflict: "report_date" })
          .select("report_date, total_cars").single();
        if (error) throw error;
        return json(req, { total: data });
      }

      default:
        return errorResponse(req, "unknown_action", 400);
    }
  } catch (e) {
    console.error("accountant-api error", e instanceof Error ? e.message : e);
    return errorResponse(req, "server_error", 500);
  }
});
