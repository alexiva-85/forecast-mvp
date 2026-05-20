# Мониторинг информации для разработки Forecast

> **Задача агента:** перед крупными фичами (блоки E, B7, C6) и **минимум раз в 2–4 недели** пройти этот чеклист, обновить находки.

---

## 1. Как фиксировать результаты

1. Создать файл `docs/research/YYYY-MM-DD.md` (пример: `2026-05-16.md`).  
2. Структура заметки:

```markdown
# Research YYYY-MM-DD

## Изменения с прошлого раза
- ...

## Влияние на Forecast
- Блок X: ...

## Действия
- [ ] ...
```

3. При изменении OSS-реестра — правка [OPEN_SOURCE.md](./OPEN_SOURCE.md).  
4. При смене приоритетов — статусы в [PROJECT.md](./PROJECT.md) §4.

---

## 2. Чеклист источников

### 2.1. Документация Polymarket

| # | Действие | URL |
|---|----------|-----|
| 1 | Скачать/прочитать индекс | https://docs.polymarket.com/llms.txt |
| 2 | Проверить changelog / migration (CLOB v2) | https://docs.polymarket.com/v2-migration |
| 3 | CTF, fees, neg-risk | разделы из llms.txt |
| 4 | Geoblock (страны) | https://docs.polymarket.com/api-reference/geoblock |
| 5 | Builder fees (если hedge) | https://docs.polymarket.com/builders/fees |

**Искать:** новые endpoints, deprecation v1, изменения EIP-712 domain.

### 2.2. GitHub (releases & commits)

Проверить **Latest release** и README:

| Репозиторий | Что смотреть |
|-------------|--------------|
| `Polymarket/ctf-exchange-v2` | Новые контракты, аудит |
| `Polymarket/clob-client-v2` | Breaking changes API |
| `Polymarket/py-clob-client-v2` | То же |
| `Polymarket/uma-ctf-adapter` | Версии adapter |
| `Polymarket/poly-market-maker` | Стратегии MM |

Команда для локальной проверки (опционально):

```bash
gh release list -R Polymarket/ctf-exchange-v2 --limit 3
gh release list -R Polymarket/clob-client-v2 --limit 3
```

### 2.3. Конкуренты / форки

| # | Репозиторий |
|---|-------------|
| 1 | `limitless-labs-group/limitless-ctf-exchange` |
| 2 | Поиск forks: https://github.com/Polymarket/ctf-exchange/forks |

**Искать:** паттерны деплоя, testnet addresses, postmortems.

### 2.4. Стек Forecast (наш)

| # | Источник | Зачем |
|---|----------|--------|
| 1 | [Supabase changelog](https://github.com/supabase/supabase/releases) | Auth, Realtime, RLS |
| 2 | [Next.js releases](https://github.com/vercel/next.js/releases) | Breaking changes (см. AGENTS.md) |
| 3 | `@supabase/ssr` npm | Совместимость |

### 2.5. Регуляторика и рынок (вне кода)

| # | Тема | Действие |
|---|------|----------|
| 1 | РФ / prediction markets | Ручной обзор перед блоком E2 |
| 2 | Санкции / OFAC | Не целевать заблокированные юрисдикции при hedge |

Не давать юридических выводов в research note — только «нужна консультация юриста».

### 2.6. Web search (агент)

Раз в цикл выполнить поисковые запросы:

- `Polymarket CTF exchange v2 2026`
- `prediction market open source CTF`
- `UMA CTF adapter market creation`

Сохранить 1–2 релевантные ссылки в research note.

---

## 3. Триггеры внепланового обзора

Запустить чеклист **сразу**, если:

- Начинаем блок **E5** (on-chain) или **E6** (oracle).  
- Планируем интеграцию **любого** внешнего CLOB.  
- Пользователь сообщил о breaking change в Polymarket API.  
- Падение/изменение поведения после `npm update` / deploy.

---

## 4. Критерии «стоит внедрить в Forecast»

| Сигнал | Действие |
|--------|----------|
| Новый стабильный `ctf-exchange-v2` release | Оценить для E5, записать commit SHA |
| Улучшение в `uma-ctf-adapter-sdk` | Упростить C2/C6 |
| Deprecation CLOB v1 | Не строить новый код на v1 |
| Новый официальный demo (builder) | Сверить с нашим auth flow, не копировать слепо |
| Ничего существенного | Research note: «без изменений», дата |

---

## 5. История обзоров

| Дата | Файл | Краткий итог |
|------|------|--------------|
| 2026-05-16 | [2026-05-16.md](./research/2026-05-16.md) | MVP v0 on Supabase; OSS реестр; Polymarket — референс |
| 2026-05-18 | [2026-05-18.md](./research/2026-05-18.md) | B7 multi-outcome off-chain; neg-risk отложен |
| 2026-05-20 | [2026-05-20.md](./research/2026-05-20.md) | CLOB/CTF V2 live (28.04); ctf-exchange-v2 v1.0.6; E5 prep |

---

## 6. Инструкция для AI-агента (копипаст)

```
1. Открой docs/RESEARCH.md и docs/OPEN_SOURCE.md.
2. Пройди чеклист §2, сравни с прошлой заметкой в docs/research/.
3. Создай docs/research/YYYY-MM-DD.md с находками.
4. Обнови OPEN_SOURCE.md и §4 PROJECT.md при необходимости.
5. Сообщи пользователю только если есть actionable изменения.
```

---

*Шаблон первой заметки: [research/2026-05-16.md](./research/2026-05-16.md)*
