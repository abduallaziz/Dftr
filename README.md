# Car Wash Reporting

Daily operations & expense reporting for a car wash. Two token-protected interfaces, no login screens:

| Interface | URL | Purpose |
|---|---|---|
| Employee (Bengali default, mobile-first) | `https://<your-domain>.pages.dev/<EMPLOYEE_TOKEN>` | Free washes, expenses, payments, today's entries |
| Accountant (Arabic RTL default) | `https://<your-domain>.pages.dev/<ACCOUNTANT_TOKEN>` | Filters (day/week/month/year/custom), totals, daily reports, entry details |

Stack: React + TypeScript (strict) + Vite + Tailwind + Lucide, Supabase Postgres + Edge Functions, Cloudflare Pages.

## Security model

- **Owner control panel:** a third token (`ADMIN_ACCESS_TOKEN`, `admin-api`) opens a panel where you can edit/delete expenses, edit or clear day reports, car counts and payments, add expenses to past days, manage categories, and read an **audit log** (before/after of every change). Only you should have this link; it bypasses the accountant count lock.
- **Links contain no role words.** The URL is just `/<token>`; the server decides the role from the token (`ping`). Any other path (root, `/employee`, `/admin`, wrong token) shows a bare `404`. Each token only opens its own interface; the employee token cannot reach accountant data and vice versa.
- Tokens must be ≥ 40 characters (use the 43-char command below, 256 bits of entropy); shorter secrets make the functions reject everything.

- The two secrets live **only** as Supabase Edge Function secrets. The URL token is sent by the browser in an `x-access-token` header and compared **server-side** (SHA-256 + constant-time compare). Missing/short (<32 chars) secrets reject everything.
- `employee-api` accepts only the employee token and can only: read *today's* data, add an expense, upsert *today's* daily report. It cannot read history. The business date is assigned by the server (Asia/Riyadh); the client cannot choose it.
- `accountant-api` accepts only the accountant token. It is read-only except one narrow write, `set_total_cars` (total cars per day, table `daily_totals`); it can never touch employee records.
- Tables have RLS enabled with **no policies** and `anon`/`authenticated` privileges revoked; reporting SQL functions are executable by `service_role` only. The service role key never reaches the frontend (the frontend only knows `VITE_SUPABASE_URL`).
- Duplicate protection: each expense carries a client-generated UUID (`client_key`, unique in DB) plus a UI lock; retries and double taps never create two rows.

## Environment variables

| Name | Where | Secret? |
|---|---|---|
| `VITE_SUPABASE_URL` | Cloudflare Pages build variable | No (public) |
| `EMPLOYEE_ACCESS_TOKEN` | Supabase function secret | **Yes** |
| `ACCOUNTANT_ACCESS_TOKEN` | Supabase function secret | **Yes** |
| `ALLOWED_ORIGIN` | Supabase function secret (e.g. `https://your-domain.pages.dev`) | No |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Injected automatically into Edge Functions | Yes (never in git/frontend) |

## Generate tokens

Use two *different* values, 43 URL-safe characters each:

```bash
openssl rand -base64 32 | tr '+/' '-_' | tr -d '=\n'; echo   # run twice
```

## Quick deploy (recommended)
1. Create a Supabase project (supabase.com, free plan) and note its **project ref**.
2. Cloudflare → Workers & Pages → Create → Pages → Connect to Git → pick this repo. Build command `npm run build`, output `dist`, variable `VITE_SUPABASE_URL=https://<project-ref>.supabase.co`. Note the `*.pages.dev` domain.
3. On your computer: `npx supabase login`, then
   `PROJECT_REF=<ref> PAGES_DOMAIN=<name>.pages.dev ./scripts/deploy-supabase.sh`
   It creates the database, generates the two tokens (saved to git-ignored `.tokens.local`), sets secrets, deploys both functions, runs the access-control check and prints both permanent links.

## Setup (manual alternative)

### 1. Supabase (free plan)
```bash
npm i -g supabase            # or: npx supabase ...
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push             # applies supabase/migrations/*.sql (tables, RLS, seed categories, functions)
supabase secrets set EMPLOYEE_ACCESS_TOKEN=... ACCOUNTANT_ACCESS_TOKEN=... ALLOWED_ORIGIN=https://your-domain.pages.dev
supabase functions deploy employee-api   --no-verify-jwt
supabase functions deploy accountant-api --no-verify-jwt
```
`--no-verify-jwt` is intentional: access is controlled by our own tokens, not Supabase Auth.

### 2. GitHub + Cloudflare Pages
1. Push this repo to GitHub (no secrets are committed; `.env*` is git-ignored).
2. Cloudflare → Workers & Pages → Create → Pages → Connect to Git → select the repo.
3. Build command `npm run build`, output directory `dist`, build variable `VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co`.
4. `public/_redirects` provides SPA routing; `public/_headers` sets `noindex`, `no-referrer`, `nosniff`, no-frame.
5. Your permanent URLs are the two links in the table above. They stay valid until you change the tokens (rotate: `supabase secrets set ...`, then share the new URLs).

### Local development
```bash
npm install
cp .env.example .env     # set VITE_SUPABASE_URL
npm run dev              # http://localhost:5173/<token> (token = the one set in Supabase)
npm run typecheck && npm test && npm run build
```
For a fully local backend: `supabase start`, `supabase functions serve --no-verify-jwt --env-file supabase/.env`, and point `VITE_SUPABASE_URL` at `http://127.0.0.1:54321`.

## Data & behavior notes
- Expense categories live in the `expense_categories` table (id, ar/en/bn names, Lucide icon name, `is_active`, order). Add or deactivate rows via SQL; icons must be in `src/utils/icons.ts`.
- Data persists in Supabase; deploying new frontend/function versions never touches it. Migrations are additive.
- Weeks run Sunday–Saturday. All reporting dates use Asia/Riyadh; timestamps are shown in Saudi time.
- Free-car counts and payments are one record per day (re-saving updates today's values). Days without a submitted report show "—" (never fabricated zeros).
- **Blind car-count check:** the employee (at the wash) and the accountant (from the camera) each enter the day's total cars independently. The employee API never returns the accountant's number. The accountant API returns the employee's number only for days where the accountant already saved theirs, and once both exist the accountant's count is locked (`count_locked`, HTTP 409). The dashboard shows Match / Mismatch (with difference) per day.
- Cars: the accountant records **total cars** per day (form at the top of the dashboard, or the pencil on a row). Free cars come from the employee; **actual cars = total − free** is computed, never stored.
- Language is stored per interface in `localStorage` (`carwash.lang.employee`, `carwash.lang.accountant`).

## Production security checklist
- [ ] Tokens generated with `openssl` (≥32 chars), different for each role, stored only as Supabase secrets.
- [ ] `ALLOWED_ORIGIN` set to the exact Pages domain.
- [ ] Both functions deployed; in Supabase dashboard, tables show RLS enabled with no policies.
- [ ] Service role key not present in Cloudflare variables or git history.
- [ ] Employee token returns `401` on `accountant-api` and vice versa (see verification below).
- [ ] Only share each URL with its intended person; rotate tokens if a phone is lost.

### Verify access control after deployment
```bash
F=https://YOUR_PROJECT_REF.supabase.co/functions/v1
curl -s -X POST $F/accountant-api -H "x-access-token: $EMPLOYEE_TOKEN"   -d '{"action":"summary","from":"2025-01-01","to":"2025-12-31"}'  # {"error":"unauthorized"}
curl -s -X POST $F/employee-api   -H "x-access-token: $ACCOUNTANT_TOKEN" -d '{"action":"get_today"}'                                         # {"error":"unauthorized"}
curl -s -X POST $F/employee-api   -d '{"action":"get_today"}'                                                                                # {"error":"unauthorized"}
curl -s $SUPABASE_URL/rest/v1/expenses -H "apikey: $ANON_KEY"                                                                                # permission denied / []
```

## Project structure
```
src/{components,features/{employee,accountant,expenses,reports},hooks,i18n/locales,pages,services,types,utils}
supabase/{functions/{_shared,employee-api,accountant-api},migrations}
tests/  (Vitest: date ranges incl. Riyadh boundaries, validation, locale parity)
```
