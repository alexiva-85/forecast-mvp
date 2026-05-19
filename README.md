# Forecast MVP

**Прогнозная биржа для русскоязычной аудитории** — по опыту и логике близко к [Polymarket](https://polymarket.com), но с **собственным финансовым контуром**, своими рынками и без зависимости от инфраструктуры Polymarket.

### Документация для команды и AI

| Документ | Назначение |
|----------|------------|
| [docs/PROJECT.md](docs/PROJECT.md) | Видение, блоки разработки, статусы, правила |
| [docs/OPEN_SOURCE.md](docs/OPEN_SOURCE.md) | Реестр OSS и что переиспользовать |
| [docs/RESEARCH.md](docs/RESEARCH.md) | Как мониторить новую информацию |
| [docs/ADMIN.md](docs/ADMIN.md) | Админка: разделы и backlog после MVP |
| [docs/AGENT_WORKFLOW.md](docs/AGENT_WORKFLOW.md) | Спринты, handoff, когда открывать новый чат агента |
| [docs/UX.md](docs/UX.md) | Правила UI (иерархия, кабинет, копирайт) |
| [AGENTS.md](AGENTS.md) | Краткие инструкции для агента в Cursor |

| | |
|---|---|
| **Репозиторий** | https://github.com/alexiva-85/forecast-mvp |
| **Стек** | Next.js · Supabase (PostgreSQL) · Vercel |
| **Статус** | MVP — тестовые деньги, 3 рынка (спорт / крипто) |
| **Язык UI** | Русский |

---

## Что это за продукт

Пользователь видит **события с исходами «Да» / «Нет»** (например: «Bitcoin выше $150k до конца 2026?»). Он покупает **доли исхода** по цене от $0.01 до $0.99 — цена отражает **оценку вероятности** рынком. Если исход наступил, каждая выигрышная доля платит **$1**; если нет — **$0**.

Это тот же принцип, что у Polymarket (prediction market + order book), но:

- расчёт и балансы — **на вашей стороне** (база данных и правила платформы);
- рынки создаёте **вы** (админ), а не каталог Polymarket;
- продукт ориентирован на **РФ / русский язык** — без геоблока чужой CLOB.

> **Сейчас (MVP):** деньги **виртуальные** ($10 000 при регистрации). Это осознанный этап: проверить UX, стакан и резолв до подключения реальных платежей или блокчейна.

---

## Forecast vs Polymarket

| | Polymarket | Forecast MVP |
|---|------------|----------------|
| Кто держит деньги | Контракты / кошельки на Polygon | **Ваш** учёт в Supabase |
| Кто создаёт события | Команда Polymarket + UMA | **Вы** (админ-панель / SQL) |
| Стакан и сделки | Их закрытый CLOB | **Ваш** matcher в PostgreSQL |
| Доступ из РФ (торговля) | Заблокирован API | **Нет привязки** к их геоблоку |
| Комиссия платформы | Platform + builder fee | **Задаёте вы** (следующие этапы) |
| Резолв исхода | UMA / их процесс | **Админ** фиксирует Да/Нет (MVP) |

**Итог:** Forecast — не «обёртка» над Polymarket, а **зачаток своей биржи** с тем же пользовательским смыслом: *купил вероятность → дождался исхода → получил выплату*.

---

## Свой финансовый контур (что это значит)

```text
┌─────────────────────────────────────────────────────────────┐
│  Пользователь (веб)                                         │
│  Регистрация · баланс · покупка Да/Нет · портфель · выплата  │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Forecast — прикладной слой (Next.js на Vercel)              │
│  UI · авторизация · вызов торговых функций                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Финансовое ядро (Supabase / PostgreSQL)                    │
│  • profiles.balance — тестовый USD (MVP)                    │
│  • orders — лимитный стакан                                 │
│  • trades — исполненные сделки                              │
│  • positions — доли Да/Нет по рынкам                          │
│  • place_order() — матчинг и списания атомарно в БД          │
│  • redeem_positions() — выплата $1 за выигрышную долю       │
└─────────────────────────────────────────────────────────────┘
```

**На этапе MVP** контур полностью под вашим контролем: вы решаете, сколько дать на тест, когда закрыть рынок и какой исход зачесть. **Позже** тот же слой можно перенести на смарт-контракты (CTF + Exchange, как в open source Polymarket), не меняя идею продукта для пользователя.

---

## Функции MVP (уже реализовано)

| Функция | Описание |
|---------|----------|
| Каталог рынков | Фильтр: все / спорт / крипто |
| Карточка рынка | Вероятность «Да», стакан, последние сделки |
| Торговля | Лимитные ордера buy/sell на Да или Нет |
| Портфель | Баланс и открытые позиции |
| Резолв | Админ: исход Да/Нет → пользователь «Получить выплату» |
| Админка | Обзор, рынки, мастер создания, очередь резолва, Gamma, настройки (`/admin`) |
| Auth | Email + пароль (Supabase Auth) |

### Тестовые рынки (seed)

1. **Спорт** — Реал Мадрид выиграет Лигу чемпионов 2025/26  
2. **Крипто** — Bitcoin выше $150 000 до 31.12.2026  
3. **Спорт** — Сборная России выйдет на ЧМ-2026  

---

## Техническая архитектура

```text
forecast-mvp/
├── src/app/              # Страницы (App Router)
│   ├── page.tsx          # Список рынков
│   ├── market/[slug]/    # Рынок + торговля
│   ├── portfolio/        # Портфель
│   ├── admin/            # Операторская панель (обзор, рынки, резолв, идеи)
│   └── login/            # Вход / регистрация
├── src/components/       # UI-компоненты
├── src/lib/              # Supabase-клиенты, расчёт цен
└── supabase/
    ├── migrations/       # Схема + RPC (place_order, redeem, admin)
    └── seed.sql          # 3 рынка
```

| Слой | Технология |
|------|------------|
| Frontend | Next.js 16, React, Tailwind |
| Backend | Server Actions + Supabase RPC |
| База | PostgreSQL (RLS, security definer functions) |
| Хостинг | Vercel |
| Репозиторий | GitHub `alexiva-85/forecast-mvp` |

---

## Как работает сделка (простыми словами)

1. Пользователь выставляет **лимитный ордер** (например: купить 10 долей «Да» по $0.55).  
2. Система ищет встречные заявки на продажу по цене ≤ $0.55.  
3. При совпадении создаётся **сделка**: у покупателя растут доли, у продавца — баланс, в `trades` — запись.  
4. Неисполненный остаток остаётся в **стакане**.  
5. После **резолва** админом выигрышные доли обмениваются на **$1 за штуку** через `redeem_positions`.

Цена «Да» на главной — средняя по последним сделкам или mid по стакану (как упрощённый индикатор вероятности).

---

## Дорожная карта (после MVP)

| Этап | Содержание |
|------|------------|
| **1 — сейчас** | Виртуальные деньги, 3 рынка, RU UI, свой matcher в БД |
| **2** | Админка создания рынков без SQL, модерация, KYC-заготовка |
| **3** | Реальные депозиты / вывод (платёжный провайдер или крипто) |
| **4** | On-chain settlement (fork CTF Exchange), oracle для резолва |
| **5** | Ликвидность (MM-боты), комиссия платформы, мобильное приложение |

Open source Polymarket (`ctf-exchange`, `uma-ctf-adapter`) — **референс для этапа 4**, не зависимость для текущего MVP.

---

## Запуск и администрирование

### Локально

```bash
git clone https://github.com/alexiva-85/forecast-mvp.git
cd forecast-mvp
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install && npm run dev
```

### Первичная настройка БД

**Рекомендуется — через Supabase CLI** (автоматические миграции):

```bash
cp .env.example .env.local
# Заполните NEXT_PUBLIC_SUPABASE_* и SUPABASE_PROJECT_REF

supabase login
npm run db:migrate    # link + push + verify
# seed (один раз): Supabase SQL Editor → supabase/seed.sql
```

| Команда | Назначение |
|---------|------------|
| `npm run db:migrate` | Применить все миграции и проверить |
| `npm run db:push` | Только push (проект уже linked) |
| `npm run db:verify` | Проверить RPC и колонки на удалённой БД |
| `npm run db:repair-manual` | Если 001/002 применяли вручную в SQL Editor |
| `npm test` | Интеграционные тесты RPC и RLS (`supabase login` или `SUPABASE_SERVICE_ROLE_KEY` в `.env.local`) |

Миграции применяются **только локально** (`npm run db:migrate`). Секреты из `.env.local` в git не попадают (файл в `.gitignore`).

**После миграций:** `npm run dev` — запуск приложения. Seed (один раз): SQL Editor → `supabase/seed.sql`.

**Вручную (legacy):** SQL Editor → файлы из `supabase/migrations/` по порядку, затем `seed.sql`.

3. Authentication → Email → отключить **Confirm email** (для теста)

### Вход: magic link и OAuth (D3)

**Supabase Dashboard → Authentication → URL Configuration**

| Поле | Значение |
|------|----------|
| Site URL | `https://forecast-mvp-pied.vercel.app` (локально: `http://127.0.0.1:3000`) |
| Redirect URLs | `http://127.0.0.1:3000/auth/callback`, `https://forecast-mvp-pied.vercel.app/auth/callback` |

**Magic link** — включён вместе с Email (кнопка «Войти по ссылке на email» на `/login`). Письма идут через SMTP Supabase; для production настройте [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) при необходимости.

**OAuth (Google / GitHub)**

1. Создать OAuth client:
   - [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth client ID (Web)
   - [GitHub Developer settings](https://github.com/settings/developers) → OAuth App
2. **Authorized redirect URI** (одинаковый для обоих):  
   `https://mookbnjtlqqljhlizipb.supabase.co/auth/v1/callback`
3. Client ID и Secret — в Supabase Dashboard **или** одной командой:

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...   # Account → Access Tokens
export GOOGLE_CLIENT_ID=...
export GOOGLE_CLIENT_SECRET=...
export GITHUB_CLIENT_ID=...
export GITHUB_CLIENT_SECRET=...
bash scripts/configure-auth-oauth.sh
```

Агент не может создать OAuth-приложения в Google/GitHub за вас (нужен вход в ваши аккаунты). После того как client ID/secret есть — скрипт выше или вставка в Dashboard.

**Vercel:** дополнительных env для OAuth не нужно — достаточно `NEXT_PUBLIC_SUPABASE_*`. После смены redirect URLs в Supabase пересобирать Vercel не обязательно.

Локально письма magic link смотрите в Inbucket: `http://127.0.0.1:54324` (при `supabase start`).

### Сделать себя админом

```sql
update public.profiles
set is_admin = true
where id = 'ВАШ_UUID_ИЗ_auth.users';
```

Раздел **Админ** → кнопки «Исход: Да / Нет» по каждому открытому рынку.

### Деплой

- **Vercel:** импорт из GitHub, env `NEXT_PUBLIC_SUPABASE_*`  
- Скрипт: `bash scripts/deploy-all.sh` (после `gh auth login`)
- **Смена prod-домена:** [docs/DOMAIN_MIGRATION.md](docs/DOMAIN_MIGRATION.md)

### Мониторинг (Sentry + Vercel)

1. Создайте проект в [Sentry](https://sentry.io) (платформа Next.js).
2. В **Vercel → Settings → Environment Variables** (Production и Preview):
   - `NEXT_PUBLIC_SENTRY_DSN` — DSN из Sentry
   - `SENTRY_ORG`, `SENTRY_PROJECT` — slug организации и проекта
   - `SENTRY_AUTH_TOKEN` — [Auth Token](https://sentry.io/settings/account/api/auth-tokens/) с scope `project:releases` (для source maps при `next build`)
   - `SENTRY_TEST_TOKEN` — секрет для `/sentry-example-page` и `/api/sentry-test` (только production, для приёмки)
3. После деплоя: **Sentry → Issues** — необработанные ошибки; **Performance** — трейсы (sample rate 10% в production).
4. **Vercel → Logs** — runtime-логи (`console`, Server Actions); retention по плану Vercel.

Без `NEXT_PUBLIC_SENTRY_DSN` приложение работает как раньше — SDK отключён.

**Приёмка в production** (после деплоя):

1. В Vercel Production задайте `SENTRY_TEST_TOKEN` — длинная случайная строка (секрет, не в git).
2. Client error: откройте  
   `https://forecast-mvp-pied.vercel.app/sentry-example-page?token=ВАШ_ТОКЕН`  
   → **Trigger client error**.  
   В Sentry → **Issues**: новая ошибка, `environment: production`, URL `/sentry-example-page`, stack trace.
3. Server error: на той же странице → **Trigger server error (API)**  
   или в браузере:  
   `https://forecast-mvp-pied.vercel.app/api/sentry-test?token=ВАШ_ТОКЕН`  
   → HTTP 500. В **Issues** — `Forecast Sentry acceptance test (server API)`.
4. Без токена или с неверным токеном: **404** `{"error":"Not found"}` (событий в Sentry нет). С валидным токеном API отдаёт **500** JSON с `"sentry":"captured"`.
5. Performance (опционально): транзакции могут сэмплироваться (~10% в production).

---

## Монетизация (концепция)

На Polymarket зарабатывают builder fee и platform fee. У Forecast **весь fee-layer ваш**:

- комиссия с оборота (например 0.5–1% с сделки);  
- подписка / Pro-аналитика;  
- маркет-мейкинг (spread) при собственной ликвидности.

В MVP комиссия **1% с оборота** сделки (50/50 покупатель и продавец), настраивается в `platform_settings`.

---

## Юридическое и продуктовое

- MVP с **виртуальными деньгами** — не является финансовой услугой.  
- Перед реальными деньгами нужна **юридическая модель** (РФ / офшор / крипто) и политика рисков.  
- Формулировки рынков и правила резолва — **ответственность оператора платформы**.

---

## Краткое резюме для презентации

**Forecast MVP** — русскоязычная платформа прогнозных рынков по модели Polymarket: доли исходов, стакан заявок, выплата по итогу события. В отличие от обёртки на чужом API, здесь **свой финансовый контур** (учёт, matcher, резолв, рынки) и инфраструктура под контролем команды. Текущая версия доказывает продукт на тестовых деньгах; дальше — реальные платежи и при необходимости on-chain settlement без смены пользовательской логики.

---

*Создано для alexiva-85 · org Supabase `emzovmecbkanpjkoqmku` · Vercel `aleksandr-ivashchenkos-projects`*
