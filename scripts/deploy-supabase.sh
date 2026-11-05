#!/usr/bin/env bash
# One-shot Supabase deployment: migrations, secrets, Edge Functions.
# Usage:  PROJECT_REF=abcdxyz PAGES_DOMAIN=my-app.pages.dev ./scripts/deploy-supabase.sh
# Requires: `npx supabase login` done once on this machine.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${PROJECT_REF:?Set PROJECT_REF (Supabase project ref, e.g. abcdefghijklmnop)}"
: "${PAGES_DOMAIN:?Set PAGES_DOMAIN (e.g. my-app.pages.dev)}"

SB="npx --yes supabase"
TOKENS_FILE=".tokens.local"   # git-ignored; keep it private

gen() { openssl rand -base64 32 | tr '+/' '-_' | tr -d '=\n'; }

if [ -f "$TOKENS_FILE" ]; then
  # shellcheck disable=SC1090
  source "$TOKENS_FILE"
  if [ -z "${ADMIN_ACCESS_TOKEN:-}" ]; then   # older token file without the owner token
    ADMIN_ACCESS_TOKEN="$(gen)"; echo "ADMIN_ACCESS_TOKEN=$ADMIN_ACCESS_TOKEN" >> "$TOKENS_FILE"
  fi
  echo "Using existing tokens from $TOKENS_FILE"
else
  EMPLOYEE_ACCESS_TOKEN="$(gen)"
  ACCOUNTANT_ACCESS_TOKEN="$(gen)"
  ADMIN_ACCESS_TOKEN="$(gen)"
  umask 077
  printf 'EMPLOYEE_ACCESS_TOKEN=%s\nACCOUNTANT_ACCESS_TOKEN=%s\nADMIN_ACCESS_TOKEN=%s\n' "$EMPLOYEE_ACCESS_TOKEN" "$ACCOUNTANT_ACCESS_TOKEN" "$ADMIN_ACCESS_TOKEN" > "$TOKENS_FILE"
  echo "Generated new tokens -> $TOKENS_FILE"
fi

$SB link --project-ref "$PROJECT_REF"
$SB db push
$SB secrets set --project-ref "$PROJECT_REF" \
  EMPLOYEE_ACCESS_TOKEN="$EMPLOYEE_ACCESS_TOKEN" \
  ACCOUNTANT_ACCESS_TOKEN="$ACCOUNTANT_ACCESS_TOKEN" \
  ADMIN_ACCESS_TOKEN="$ADMIN_ACCESS_TOKEN" \
  ALLOWED_ORIGIN="https://$PAGES_DOMAIN"
$SB functions deploy employee-api   --project-ref "$PROJECT_REF" --no-verify-jwt
$SB functions deploy accountant-api --project-ref "$PROJECT_REF" --no-verify-jwt
$SB functions deploy admin-api      --project-ref "$PROJECT_REF" --no-verify-jwt

F="https://$PROJECT_REF.supabase.co/functions/v1"
echo; echo "== Access-control check (expect 401 x6, 200 x3) =="
code() { curl -s -o /dev/null -w '%{http_code}' -X POST "$1" -H "x-access-token: $2" -H 'content-type: application/json' -d '{"action":"ping"}'; }
echo "employee token  -> accountant-api: $(code "$F/accountant-api" "$EMPLOYEE_ACCESS_TOKEN")"
echo "accountant token-> employee-api  : $(code "$F/employee-api" "$ACCOUNTANT_ACCESS_TOKEN")"
echo "no token        -> employee-api  : $(code "$F/employee-api" "")"
echo "employee token  -> admin-api     : $(code "$F/admin-api" "$EMPLOYEE_ACCESS_TOKEN")"
echo "accountant token-> admin-api     : $(code "$F/admin-api" "$ACCOUNTANT_ACCESS_TOKEN")"
echo "admin token     -> employee-api  : $(code "$F/employee-api" "$ADMIN_ACCESS_TOKEN")"
echo "employee token  -> employee-api  : $(code "$F/employee-api" "$EMPLOYEE_ACCESS_TOKEN")"
echo "accountant token-> accountant-api: $(code "$F/accountant-api" "$ACCOUNTANT_ACCESS_TOKEN")"
echo "admin token     -> admin-api     : $(code "$F/admin-api" "$ADMIN_ACCESS_TOKEN")"

echo; echo "== Your permanent links (after Cloudflare Pages is deployed) =="
echo "Employee  : https://$PAGES_DOMAIN/$EMPLOYEE_ACCESS_TOKEN"
echo "Accountant: https://$PAGES_DOMAIN/$ACCOUNTANT_ACCESS_TOKEN"
echo "OWNER (keep private!): https://$PAGES_DOMAIN/$ADMIN_ACCESS_TOKEN"
echo; echo "Cloudflare build variable: VITE_SUPABASE_URL=https://$PROJECT_REF.supabase.co"
