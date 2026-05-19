# Инструкции для AI-агента (Forecast)

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any Next.js code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## Обязательно перед работой

1. **[docs/PROJECT.md](docs/PROJECT.md)** — какой продукт строим, блоки разработки, статусы, правила.
2. **[docs/AGENT_WORKFLOW.md](docs/AGENT_WORKFLOW.md)** — спринты, новый чат, handoff после крупного блока.
3. **[docs/ADMIN.md](docs/ADMIN.md)** — админка: текущие разделы и backlog после MVP.
4. **[docs/OPEN_SOURCE.md](docs/OPEN_SOURCE.md)** — что брать из open source, что писать самим.
5. **[docs/RESEARCH.md](docs/RESEARCH.md)** — когда проверять новую информацию (перед E5/E6 и раз в 2–4 недели).
6. **[docs/UX.md](docs/UX.md)** — при любых UI-задачах (иерархия, копирайт, кабинет).

Публичное описание: [README.md](README.md).

---

## Суть продукта (кратко)

**Forecast** — своя prediction market для русскоязычных пользователей (как Polymarket по UX, **не** обёртка на их CLOB). Свой финансовый контур: балансы, стакан, сделки, резолв. Сейчас MVP на **тестовых деньгах** в Supabase/PostgreSQL.

**Не предлагать** как основной путь: торговлю через Polymarket API для пользователей из РФ.

---

## После завершения задачи

- Обновить статус блока в `docs/PROJECT.md` §4, если закрыт целый подпункт (например B3).
- При новых OSS-зависимостях — запись в `docs/OPEN_SOURCE.md`.
- При обзоре внешних источников — `docs/research/YYYY-MM-DD.md` по шаблону из `docs/RESEARCH.md`.

### Крупный блок (обязательно)

Если закрыт **крупный блок** (см. [docs/AGENT_WORKFLOW.md](docs/AGENT_WORKFLOW.md) §1–§5):

1. Пройти чеклист завершения в AGENT_WORKFLOW §5.
2. В конце ответа выдать **handoff-бриф** (§6) — блок «Скопируйте в новый агент».
3. **Рекомендовать новый чат** для следующего крупного блока, если пользователь не просит мелкую доработку в том же треде.

---

## Стек

Next.js 16 (App Router) · Supabase · TypeScript · Tailwind · Vercel

Торговая логика MVP: RPC в `supabase/migrations/`. Применение: `npm run db:migrate` (не SQL Editor вручную).
