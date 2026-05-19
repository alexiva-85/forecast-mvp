#!/usr/bin/env bash
# Включить Google и/или GitHub OAuth в Supabase (remote) через Management API.
#
# Сначала создайте OAuth-приложения:
#   Google: https://console.cloud.google.com/apis/credentials
#   GitHub: https://github.com/settings/developers
# Authorized redirect URI (оба провайдера):
#   https://mookbnjtlqqljhlizipb.supabase.co/auth/v1/callback
#
# Затем:
#   export SUPABASE_ACCESS_TOKEN=sbp_...   # https://supabase.com/dashboard/account/tokens
#   export GOOGLE_CLIENT_ID=...
#   export GOOGLE_CLIENT_SECRET=...
#   export GITHUB_CLIENT_ID=...
#   export GITHUB_CLIENT_SECRET=...
#   bash scripts/configure-auth-oauth.sh

set -euo pipefail

REF="${SUPABASE_PROJECT_REF:-mookbnjtlqqljhlizipb}"
API="https://api.supabase.com/v1/projects/${REF}/config/auth"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "❌ Нужен SUPABASE_ACCESS_TOKEN (Dashboard → Account → Access Tokens)"
  exit 1
fi

if [[ -z "${GOOGLE_CLIENT_ID:-}" && -z "${GITHUB_CLIENT_ID:-}" ]]; then
  echo "❌ Задайте хотя бы GOOGLE_CLIENT_ID или GITHUB_CLIENT_ID (+ secret)"
  exit 1
fi

payload="$(node -e '
const body = {};
if (process.env.GOOGLE_CLIENT_ID) {
  body.external_google_enabled = true;
  body.external_google_client_id = process.env.GOOGLE_CLIENT_ID;
  body.external_google_secret = process.env.GOOGLE_CLIENT_SECRET || "";
}
if (process.env.GITHUB_CLIENT_ID) {
  body.external_github_enabled = true;
  body.external_github_client_id = process.env.GITHUB_CLIENT_ID;
  body.external_github_secret = process.env.GITHUB_CLIENT_SECRET || "";
}
console.log(JSON.stringify(body));
')"

echo "==> PATCH ${API}"
response="$(curl -sS -w "\n%{http_code}" -X PATCH "$API" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$payload")"

http_code="$(echo "$response" | tail -n1)"
body="$(echo "$response" | sed '$d')"

if [[ "$http_code" != "200" ]]; then
  echo "❌ HTTP ${http_code}"
  echo "$body" | head -c 2000
  exit 1
fi

echo "✅ OAuth в Supabase обновлён"
if [[ -n "${GOOGLE_CLIENT_ID:-}" ]]; then
  echo "   Google: enabled"
fi
if [[ -n "${GITHUB_CLIENT_ID:-}" ]]; then
  echo "   GitHub: enabled"
fi
echo ""
echo "Проверка: /login → «Войти через Google» / GitHub на prod или localhost"
