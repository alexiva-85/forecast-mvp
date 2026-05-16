# Forecast MVP

Тестовая платформа прогнозных рынков (спорт и крипто) на **Next.js + Supabase + Vercel**.

- Виртуальный баланс **$10 000** при регистрации
- 3 тестовых рынка (seed)
- Лимитный стакан и сделки в PostgreSQL
- Русский интерфейс

## Быстрый старт

### 1. Supabase

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard/org/emzovmecbkanpjkoqmku) → **New project**.
2. **SQL Editor** → вставьте и выполните файл `supabase/migrations/001_initial.sql`.
3. Затем выполните `supabase/seed.sql` (3 рынка).
4. **Authentication** → Providers → Email: включите, для MVP отключите **Confirm email**.
5. **Project Settings → API** — скопируйте URL и `anon` key.

### 2. Локально

```bash
cd projects/forecast-mvp
cp .env.example .env.local
# заполните NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

Откройте http://localhost:3000

### 3. Админ (вы)

После регистрации в SQL Editor:

```sql
update public.profiles
set is_admin = true
where id = 'ВАШ_UUID_ИЗ_auth.users';
```

UUID: **Authentication → Users** → скопировать User UID.

В разделе **Админ** можно завершить рынок (исход Да/Нет). Пользователи забирают выплату на странице рынка.

### 4. Vercel

1. [vercel.com/aleksandr-ivashchenkos-projects](https://vercel.com/aleksandr-ivashchenkos-projects) → **Add New Project**.
2. Импорт репозитория с GitHub `alexiva-85/forecast-mvp` (см. ниже).
3. Environment Variables — те же `NEXT_PUBLIC_SUPABASE_*`.
4. Deploy.

### 5. GitHub

```bash
cd projects/forecast-mvp
git remote add origin git@github.com:alexiva-85/forecast-mvp.git
git add .
git commit -m "Initial Forecast MVP"
git push -u origin main
```

## Структура

| Путь | Назначение |
|------|------------|
| `supabase/migrations/` | Схема БД, торговые функции |
| `src/app/` | Страницы и server actions |
| `src/components/` | UI |

## Тестовые рынки

1. Реал Мадрид — Лига чемпионов (спорт)
2. Bitcoin $150k (крипто)
3. Сборная России — ЧМ-2026 (спорт)

---

Не финансовая услуга. Только виртуальные деньги для MVP.
