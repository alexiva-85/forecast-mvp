#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# .env.local — URL и anon (без service_role в git)
if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

REF="${SUPABASE_PROJECT_REF:-mookbnjtlqqljhlizipb}"

if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  if command -v supabase >/dev/null 2>&1; then
    echo "==> SUPABASE_SERVICE_ROLE_KEY не в .env.local — берём из Supabase CLI"
    SUPABASE_SERVICE_ROLE_KEY="$(
      supabase projects api-keys --project-ref "$REF" -o json 2>/dev/null \
        | node -e "
          const rows = JSON.parse(require('fs').readFileSync(0, 'utf8'));
          const row = rows.find((r) => r.name === 'service_role');
          if (row) process.stdout.write(row.api_key);
        " || true
    )"
    export SUPABASE_SERVICE_ROLE_KEY
  fi
fi

if [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" || -z "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]]; then
  echo "❌ В .env.local нужны NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY"
  exit 1
fi

if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo ""
  echo "❌ Нет SUPABASE_SERVICE_ROLE_KEY для интеграционных тестов."
  echo ""
  echo "Вариант 1 — добавьте в .env.local (только локально, не коммитить):"
  echo "  Supabase Dashboard → Project Settings → API → service_role → Reveal"
  echo "  SUPABASE_SERVICE_ROLE_KEY=eyJ..."
  echo ""
  echo "Вариант 2 — войдите в CLI и запустите снова:"
  echo "  supabase login"
  echo "  npm test"
  echo ""
  exit 1
fi

exec npx vitest run "$@"
