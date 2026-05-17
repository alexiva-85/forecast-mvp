#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Установите Supabase CLI: https://supabase.com/docs/guides/cli"
  exit 1
fi

if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  if [[ -f .env.local ]]; then
    SUPABASE_PROJECT_REF="$(grep -E '^SUPABASE_PROJECT_REF=' .env.local | cut -d= -f2- || true)"
  fi
fi

SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:-mookbnjtlqqljhlizipb}"

if ! supabase projects list 2>/dev/null | grep -q "$SUPABASE_PROJECT_REF"; then
  echo "Сначала войдите: supabase login"
  exit 1
fi

echo "==> Link → $SUPABASE_PROJECT_REF"
supabase link --project-ref "$SUPABASE_PROJECT_REF" --yes 2>/dev/null || supabase link --project-ref "$SUPABASE_PROJECT_REF"

echo "==> Push migrations"
supabase db push --yes

echo "==> Verify"
node scripts/verify-migrations.mjs

echo ""
echo "Готово."
