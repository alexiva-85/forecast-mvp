# Переезд Forecast MVP на рабочий домен

> Чеклист при смене временного Vercel-URL на production-домен.  
> Supabase-проект **не меняется** — меняется только домен приложения.

## Константы (не менять при переезде)

| Параметр | Значение |
|----------|----------|
| Временный домен (сейчас) | `https://forecast-mvp-pied.vercel.app` |
| Рабочий домен (заполнить) | `https://НОВЫЙ-ДОМЕН` |
| Supabase project ref | `mookbnjtlqqljhlizipb` |
| Supabase URL | `https://mookbnjtlqqljhlizipb.supabase.co` |
| **OAuth callback (Google/GitHub)** | `https://mookbnjtlqqljhlizipb.supabase.co/auth/v1/callback` |

### Важно про OAuth

Авторизация идёт **через Supabase**, не напрямую на ваш домен.

- В Google/GitHub **redirect URI обычно не меняется** — остаётся Supabase callback выше.
- Меняются: **Site URL**, **Redirect URLs** приложения в Supabase, **Homepage** / **JavaScript origins** в OAuth-приложениях.

В коде callback строится от текущего origin (`src/lib/auth-callback-url.ts`, `LoginForms.tsx`) — после переезда приложение само шлёт `https://НОВЫЙ-ДОМЕН/auth/callback`, **если** этот URL разрешён в Supabase.

---

## Перед переездом

- [ ] D3 (OAuth + magic link) задеплоен на `main`.
- [ ] OAuth в Supabase настроен (Google/GitHub Client ID/Secret).
- [ ] DNS у регистратора указывает на Vercel (A/CNAME по инструкции Vercel).
- [ ] Решено: apex (`example.com`) или `www` — один канонический URL для Site URL.

---

## Порядок работ (рекомендуемый)

1. Vercel — подключить домен, дождаться SSL.
2. Supabase — Site URL + Redirect URLs (старый Vercel URL **оставить**).
3. Google / GitHub — origins и Homepage (callback **не трогать**).
4. Проверка auth на новом домене.
5. Документация в репо (README, AGENT_WORKFLOW, эта памятка).
6. Удаление старых URL — **только после** успешной проверки.

Пересборка Vercel из‑за смены redirect URLs в Supabase **не обязательна**.

---

## 1. Vercel

- [ ] Project → **Settings → Domains** → добавить `НОВЫЙ-ДОМЕН` (и при необходимости `www`).
- [ ] Дождаться **Valid Configuration** и SSL.
- [ ] Выбрать **primary domain** (канонический).
- [ ] Настроить redirect: `www` → apex или наоборот.
- [ ] Убедиться, что `forecast-mvp-pied.vercel.app` по-прежнему открывается (временно для отката).

**Env в Vercel** — менять только если меняете Supabase-проект:

| Переменная | Действие |
|------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Не менять** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Не менять** |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_*` | **Не менять** |

В Forecast MVP **нет** `NEXT_PUBLIC_SITE_URL`, `APP_URL`, `AUTH_REDIRECT_URL` — отдельно заводить не нужно.

---

## 2. Supabase → Authentication → URL Configuration

| Поле | Действие |
|------|----------|
| **Site URL** | Заменить на `https://НОВЫЙ-ДОМЕН` |
| **Redirect URLs** | **Добавить** `https://НОВЫЙ-ДОМЕН/auth/callback` |

**Оставить** (не удалять до конца проверки):

- `https://forecast-mvp-pied.vercel.app/auth/callback`
- `http://127.0.0.1:3000/auth/callback`

**Зачем Site URL:** ссылки в письмах (magic link, сброс пароля). Сброс пароля в коде: `window.location.origin` → `/auth/reset-password`.

Опционально (локально): обновить `additional_redirect_urls` в `supabase/config.toml` — на remote не влияет.

---

## 3. GitHub → OAuth App (Forecast MVP)

| Поле | Значение |
|------|----------|
| **Homepage URL** | `https://НОВЫЙ-ДОМЕН` |
| **Authorization callback URL** | `https://mookbnjtlqqljhlizipb.supabase.co/auth/v1/callback` (**без изменений**) |

Device Flow — **OFF**.

---

## 4. Google Cloud → OAuth client (Web)

| Поле | Действие |
|------|----------|
| **Authorized JavaScript origins** | Добавить `https://НОВЫЙ-ДОМЕН`; временно оставить `https://forecast-mvp-pied.vercel.app`; оставить `http://127.0.0.1:3000` |
| **Authorized redirect URIs** | Только `https://mookbnjtlqqljhlizipb.supabase.co/auth/v1/callback` (**без изменений**) |

---

## 5. Код и репозиторий

### Runtime-код

В `src/` **нет** захардкоженного `forecast-mvp-pied.vercel.app`. Auth использует `window.location.origin`.

### Документация (обновить после переезда)

- `README.md` — блок D3, примеры Sentry-test URL
- `docs/AGENT_WORKFLOW.md` — строка `Prod:` в брифе
- `docs/DOMAIN_MIGRATION.md` — заменить плейсхолдер `НОВЫЙ-ДОМЕН` на фактический домен
- `supabase/config.toml` — `additional_redirect_urls`

### Поиск по репо

```bash
rg "forecast-mvp-pied|vercel\.app" --glob '!node_modules'
```

---

## 6. Что не трогать

- Supabase project ref и `NEXT_PUBLIC_SUPABASE_*`
- OAuth callback URI в Google/GitHub
- Миграции БД, RLS, RPC
- Gamma API / Polymarket URLs

---

## 7. Проверка после переезда

На **`https://НОВЫЙ-ДОМЕН`**:

| Сценарий | Ожидание |
|----------|----------|
| `/login` | Google, GitHub, magic link, пароль |
| Google / GitHub | → Supabase → `/auth/callback` → каталог или `?next=` |
| Magic link | Письмо → вход; домен в письме = Site URL |
| Пароль | Вход / регистрация |
| «Забыли пароль?» | `/auth/reset-password` на новом домене |
| Кабинет | `/portfolio` после логина |
| Админ | `/admin` под `is_admin` |
| Logout → login | Повторный вход |
| Старый URL | `forecast-mvp-pied.vercel.app` работает, пока redirect URL не удалили |

Дополнительно: Sentry с нового домена; при необходимости `*.vercel.app` в Supabase Redirect URLs для preview.

---

## 8. Очистка (после 100% проверки)

- [ ] Удалить `https://forecast-mvp-pied.vercel.app/auth/callback` из Supabase Redirect URLs
- [ ] Убрать старый origin из Google (опционально)
- [ ] Обновить Homepage в GitHub
- [ ] Vercel: redirect со старого `*.vercel.app` на новый домен — по решению

---

## 9. Откат

1. В Supabase вернуть **Site URL** на `https://forecast-mvp-pied.vercel.app`.
2. Убедиться, что старый redirect URL в списке.
3. Пользователи снова заходят через временный домен.

---

## Схема auth

```text
Браузер (НОВЫЙ-ДОМЕН/login)
    → signInWithOAuth / signInWithOtp
    → Supabase Auth
    → Google/GitHub или email (magic link)
    → mookbnjtlqqljhlizipb.supabase.co/auth/v1/callback
    → НОВЫЙ-ДОМЕН/auth/callback?code=...
    → exchangeCodeForSession → / или ?next=
```

---

*Версия: 2026-05-19 · Forecast MVP · project ref `mookbnjtlqqljhlizipb`*
