import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { adminClient } from "../_shared/db.ts";
import { tokenMatches } from "../_shared/auth.ts";
import { corsHeaders, errorResponse, json, readJson } from "../_shared/http.ts";
import {
  parseCategory, parseDate, parseRange, parseSetting, parseDayEdit, parseExpensePatch, parseId, parseList, parseNewExpense,
} from "../_shared/validation.ts";

const EXP = "id, category_id, amount, report_date, created_at";
const DAILY = "report_date, employee_total_cars, free_large, free_small, mada, visa, mastercard, cash";

async function audit(db: SupabaseClient, action: string, table: string, key: string, before: unknown, after: unknown) {
  const { error } = await db.from("audit_log").insert({ action, table_name: table, record_key: key, before: before ?? null, after: after ?? null });
  if (error) throw error;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return errorResponse(req, "method_not_allowed", 405);
  if (!(await tokenMatches(req.headers.get("x-access-token"), "ADMIN_ACCESS_TOKEN"))) {
    return errorResponse(req, "unauthorized", 401);
  }
  const body = await readJson(req);
  if (!body) return errorResponse(req, "bad_request", 400);
  if (body.action === "ping") return json(req, { ok: true });

  try {
    const db = adminClient();
    const { data: today, error: tErr } = await db.rpc("riyadh_today");
    if (tErr || typeof today !== "string") throw tErr ?? new Error("no_date");

    switch (body.action) {
      case "get_day": {
        const d = parseDate(body.date);
        if (!d.ok) return errorResponse(req, d.error, 400);
        const [daily, total, expenses, cats] = await Promise.all([
          db.from("daily_reports").select(DAILY).eq("report_date", d.value).maybeSingle(),
          db.from("daily_totals").select("report_date, total_cars").eq("report_date", d.value).maybeSingle(),
          db.from("expenses").select(EXP).eq("report_date", d.value).order("created_at", { ascending: true }).limit(1000),
          db.from("expense_categories").select("*").order("sort_order"),
        ]);
        const err = daily.error ?? total.error ?? expenses.error ?? cats.error;
        if (err) throw err;
        return json(req, { today, daily: daily.data, total: total.data, expenses: expenses.data, categories: cats.data });
      }

      case "days": {
        const l = parseList(body);
        if (!l.ok) return errorResponse(req, l.error, 400);
        const { data, error } = await db.rpc("report_daily", {
          p_from: l.value.from, p_to: l.value.to, p_sort: l.value.sort, p_dir: l.value.dir,
          p_limit: l.value.limit, p_offset: l.value.offset,
        });
        if (error) throw error;
        return json(req, data);
      }

      case "update_expense": {
        const p = parseExpensePatch(body);
        if (!p.ok) return errorResponse(req, p.error, 400);
        const { data: before, error: bErr } = await db.from("expenses").select(EXP).eq("id", p.value.id).maybeSingle();
        if (bErr) throw bErr;
        if (!before) return errorResponse(req, "not_found", 404);
        const patch: Record<string, unknown> = {};
        if (p.value.amount !== undefined) patch.amount = p.value.amount;
        if (p.value.category_id !== undefined) patch.category_id = p.value.category_id;
        const { data, error } = await db.from("expenses").update(patch).eq("id", p.value.id).select(EXP).single();
        if (error) {
          if (error.code === "23503") return errorResponse(req, "invalid_category", 400);
          throw error;
        }
        await audit(db, "update", "expenses", String(p.value.id), before, data);
        return json(req, { expense: data });
      }

      case "delete_expense": {
        const id = parseId(body.id);
        if (!id.ok) return errorResponse(req, id.error, 400);
        const { data: before, error: bErr } = await db.from("expenses").select(EXP).eq("id", id.value).maybeSingle();
        if (bErr) throw bErr;
        if (!before) return errorResponse(req, "not_found", 404);
        const { error } = await db.from("expenses").delete().eq("id", id.value);
        if (error) throw error;
        await audit(db, "delete", "expenses", String(id.value), before, null);
        return json(req, { ok: true });
      }

      case "add_expense": {
        const n = parseNewExpense(body);
        if (!n.ok) return errorResponse(req, n.error, 400);
        if (n.value.date > today) return errorResponse(req, "invalid_date", 400);
        const { data, error } = await db.from("expenses").insert({
          category_id: n.value.category_id, amount: n.value.amount,
          report_date: n.value.date, client_key: crypto.randomUUID(),
        }).select(EXP).single();
        if (error) {
          if (error.code === "23503") return errorResponse(req, "invalid_category", 400);
          throw error;
        }
        await audit(db, "insert", "expenses", String(data.id), null, data);
        return json(req, { expense: data });
      }

      case "save_day": {
        const e = parseDayEdit(body);
        if (!e.ok) return errorResponse(req, e.error, 400);
        if (e.value.date > today) return errorResponse(req, "invalid_date", 400);
        const date = e.value.date;
        if (Object.keys(e.value.daily).length > 0) {
          const { data: before } = await db.from("daily_reports").select(DAILY).eq("report_date", date).maybeSingle();
          const { data, error } = await db.from("daily_reports")
            .upsert({ report_date: date, ...e.value.daily, updated_at: new Date().toISOString() }, { onConflict: "report_date" })
            .select(DAILY).single();
          if (error) throw error;
          await audit(db, before ? "update" : "insert", "daily_reports", date, before, data);
        }
        if (e.value.total_cars !== undefined) {
          const { data: before } = await db.from("daily_totals").select("report_date, total_cars").eq("report_date", date).maybeSingle();
          if (e.value.total_cars === null) {
            if (before) {
              const { error } = await db.from("daily_totals").delete().eq("report_date", date);
              if (error) throw error;
              await audit(db, "delete", "daily_totals", date, before, null);
            }
          } else {
            const { data, error } = await db.from("daily_totals")
              .upsert({ report_date: date, total_cars: e.value.total_cars, updated_at: new Date().toISOString() }, { onConflict: "report_date" })
              .select("report_date, total_cars").single();
            if (error) throw error;
            await audit(db, before ? "update" : "insert", "daily_totals", date, before, data);
          }
        }
        return json(req, { ok: true });
      }

      case "delete_day_data": {
        // Removes the daily report (cars/payments) and accountant count for a day. Expenses are deleted one by one.
        const d = parseDate(body.date);
        if (!d.ok) return errorResponse(req, d.error, 400);
        const [dr, dt] = await Promise.all([
          db.from("daily_reports").select(DAILY).eq("report_date", d.value).maybeSingle(),
          db.from("daily_totals").select("report_date, total_cars").eq("report_date", d.value).maybeSingle(),
        ]);
        if (dr.data) {
          const { error } = await db.from("daily_reports").delete().eq("report_date", d.value);
          if (error) throw error;
          await audit(db, "delete", "daily_reports", d.value, dr.data, null);
        }
        if (dt.data) {
          const { error } = await db.from("daily_totals").delete().eq("report_date", d.value);
          if (error) throw error;
          await audit(db, "delete", "daily_totals", d.value, dt.data, null);
        }
        return json(req, { ok: true });
      }

      case "save_category": {
        const c = parseCategory(body);
        if (!c.ok) return errorResponse(req, c.error, 400);
        const { create, ...row } = c.value;
        const { data: before } = await db.from("expense_categories").select("*").eq("id", row.id).maybeSingle();
        if (create && before) return errorResponse(req, "already_exists", 409);
        if (!create && !before) return errorResponse(req, "not_found", 404);
        const { data, error } = await db.from("expense_categories").upsert(row, { onConflict: "id" }).select("*").single();
        if (error) throw error;
        await audit(db, create ? "insert" : "update", "expense_categories", row.id, before, data);
        return json(req, { category: data });
      }

      case "counts": {
        // Unmasked comparison of both counts (the owner sees what each person recorded).
        const r = parseRange(body);
        if (!r.ok) return errorResponse(req, r.error, 400);
        const [emp, acc] = await Promise.all([
          db.from("daily_reports").select("report_date, employee_total_cars").gte("report_date", r.value.from).lte("report_date", r.value.to).not("employee_total_cars", "is", null),
          db.from("daily_totals").select("report_date, total_cars").gte("report_date", r.value.from).lte("report_date", r.value.to),
        ]);
        if (emp.error) throw emp.error;
        if (acc.error) throw acc.error;
        const byDate = new Map<string, { report_date: string; employee: number | null; accountant: number | null }>();
        for (const e of emp.data ?? []) byDate.set(e.report_date, { report_date: e.report_date, employee: e.employee_total_cars, accountant: null });
        for (const a of acc.data ?? []) {
          const row = byDate.get(a.report_date) ?? { report_date: a.report_date, employee: null, accountant: null };
          row.accountant = a.total_cars;
          byDate.set(a.report_date, row);
        }
        const rows = [...byDate.values()].sort((x, y) => (x.report_date < y.report_date ? 1 : -1));
        return json(req, { rows });
      }

      case "get_settings": {
        const { data, error } = await db.from("app_settings").select("key, value");
        if (error) throw error;
        const map = Object.fromEntries((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
        return json(req, { show_payments_to_accountant: map.show_payments_to_accountant !== false });
      }

      case "set_setting": {
        const s = parseSetting(body);
        if (!s.ok) return errorResponse(req, s.error, 400);
        const { data: before } = await db.from("app_settings").select("key, value").eq("key", s.value.key).maybeSingle();
        const { data, error } = await db.from("app_settings")
          .upsert({ key: s.value.key, value: s.value.value, updated_at: new Date().toISOString() }, { onConflict: "key" })
          .select("key, value").single();
        if (error) throw error;
        await audit(db, before ? "update" : "insert", "app_settings", s.value.key, before, data);
        return json(req, { ok: true });
      }

      case "audit": {
        const { data, error } = await db.from("audit_log").select("*").order("id", { ascending: false }).limit(200);
        if (error) throw error;
        return json(req, { entries: data });
      }

      default:
        return errorResponse(req, "unknown_action", 400);
    }
  } catch (e) {
    console.error("admin-api error", e instanceof Error ? e.message : e);
    return errorResponse(req, "server_error", 500);
  }
});
