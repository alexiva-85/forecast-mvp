#!/usr/bin/env bash
set -euo pipefail

# Запустите в Terminal.app (не в песочнице Cursor):
#   bash /Users/aleksandrivashchenko/projects/forecast-mvp/scripts/deploy-all.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> 1. GitHub"
if ! gh auth status >/dev/null 2>&1; then
  echo "Сначала: gh auth login -h github.com"
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  gh repo create alexiva-85/forecast-mvp --public --source=. --remote=origin --push || {
    git remote add origin git@github.com:alexiva-85/forecast-mvp.git
    git push -u origin main
  }
else
  git push -u origin main
fi
echo "GitHub: https://github.com/alexiva-85/forecast-mvp"

echo ""
echo "==> 2. Supabase — создайте проект вручную:"
echo "    https://supabase.com/dashboard/org/emzovmecbkanpjkoqmku"
echo "    Имя: forecast-mvp"
echo "    Затем: supabase login && npm run db:migrate"
echo "    Seed (один раз): SQL Editor → supabase/seed.sql"
echo ""
read -rp "Вставьте NEXT_PUBLIC_SUPABASE_URL: " SUPA_URL
read -rp "Вставьте NEXT_PUBLIC_SUPABASE_ANON_KEY: " SUPA_KEY

cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=$SUPA_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPA_KEY
EOF

echo ""
echo "==> 3. Vercel"
if ! vercel whoami >/dev/null 2>&1; then
  vercel login
fi
vercel link --yes 2>/dev/null || true
vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< "$SUPA_URL" || true
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<< "$SUPA_KEY" || true
vercel --prod

echo ""
echo "Готово. Откройте URL из вывода Vercel."
