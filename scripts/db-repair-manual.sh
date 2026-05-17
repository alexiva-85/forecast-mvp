#!/usr/bin/env bash
# Если миграции применяли вручную через SQL Editor — отметить их в истории CLI.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REF="${SUPABASE_PROJECT_REF:-mookbnjtlqqljhlizipb}"

supabase link --project-ref "$REF" --yes 2>/dev/null || supabase link --project-ref "$REF"

echo "Отмечаем 001 и 002 как applied (без повторного запуска SQL)..."
supabase migration repair 20260516120000 20260516120001 --status applied --yes

echo "Теперь: npm run db:push"
