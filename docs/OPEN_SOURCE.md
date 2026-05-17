# Open Source — реестр для Forecast

> Что можно и нужно переиспользовать, что закрыто у Polymarket, и как не нарушить границу «свой контур».

**Обновлять** при каждом проходе по [RESEARCH.md](./RESEARCH.md).

---

## 1. Политика использования OSS

1. **Предпочитать** официальные репозитории Polymarket/Gnosis с аудитом и MIT (или совместимой) лицензией.  
2. **Не копировать** закрытый matching engine — только контракты и клиенты.  
3. **Polymarket API** для production-торговли нашей РФ-аудитории — **не использовать**; Gamma — только read-only.  
4. Форки (Limitless и др.) — смотреть как **примеры деплоя**, не как истину без ревью.  
5. В коде указывать источник адаптированных фрагментов, если копируем существенные части.

---

## 2. Реестр репозиториев

### 2.1. Протокол и settlement (блок E)

| Репозиторий | Назначение для Forecast | Когда подключать | Лицензия |
|-------------|----------------------|------------------|----------|
| [Polymarket/ctf-exchange](https://github.com/Polymarket/ctf-exchange) | Биржевой контракт v1, hybrid CLOB settlement | E5 testnet | MIT |
| [Polymarket/ctf-exchange-v2](https://github.com/Polymarket/ctf-exchange-v2) | V2: builder field, fee layer | E5 (предпочтительно v2) | Проверить LICENSE в repo |
| [gnosis/conditional-tokens-contracts](https://github.com/gnosis/conditional-tokens-contracts) | ERC1155 доли исходов | E5 | LGPL-3.0 |
| [Polymarket/uma-ctf-adapter](https://github.com/Polymarket/uma-ctf-adapter) | Резолв через UMA | E6 | MIT |
| [Polymarket/uma-ctf-adapter-sdk](https://github.com/Polymarket/uma-ctf-adapter-sdk) | Создание рынков on-chain | C2 + E6 | MIT |

### 2.2. Справочно (не для нашего settlement в MVP)

| Репозиторий | Назначение | Ограничение |
|-------------|------------|-------------|
| [Polymarket/clob-client-v2](https://github.com/Polymarket/clob-client-v2) | Клиент их CLOB | Только если осознанный hedge/desks **вне РФ**; не ядро продукта |
| [Polymarket/py-clob-client-v2](https://github.com/Polymarket/py-clob-client-v2) | Python CLOB | То же |
| [Polymarket/rs-clob-client-v2](https://github.com/Polymarket/rs-clob-client-v2) | Rust CLOB | То же |
| [Polymarket/builder-relayer-client](https://github.com/Polymarket/builder-relayer-client) | Gasless on-chain | Только при интеграции с **их** CLOB как builder |
| [Polymarket/poly-market-maker](https://github.com/Polymarket/poly-market-maker) | MM-стратегии | Адаптировать под **наш** API/БД (E7) |

### 2.3. Примеры интеграций (UI/auth)

| Репозиторий | Что взять |
|-------------|-----------|
| [Polymarket/safe-wallet-integration](https://github.com/Polymarket/safe-wallet-integration) | Паттерн auth + orders + positions |
| [Polymarket/wagmi-safe-builder-example](https://github.com/Polymarket/wagmi-safe-builder-example) | Wallet + relayer flow |
| [Polymarket/privy-safe-builder-example](https://github.com/Polymarket/privy-safe-builder-example) | Embedded wallet |

Использовать как **референс UX**, не как обязательную архитектуру Forecast MVP.

### 2.4. Референс-форки (изучать)

| Репозиторий | Зачем |
|-------------|--------|
| [limitless-labs-group/limitless-ctf-exchange](https://github.com/limitless-labs-group/limitless-ctf-exchange) | Как другие форкнули exchange |
| [limitless-labs-group/ctf-helper](https://github.com/limitless-labs-group/ctf-helper) | Утилиты CTF |

---

## 3. Документация (не код, но обязательна)

| Ресурс | URL | Использование |
|--------|-----|---------------|
| Индекс доки Polymarket | https://docs.polymarket.com/llms.txt | Полный список страниц для агента |
| CTF overview | https://docs.polymarket.com/trading/ctf/overview | Модель долей |
| CLOB intro | https://docs.polymarket.com/developers/CLOB/introduction | Понимание hybrid CLOB (для E5) |
| Geoblock | https://docs.polymarket.com/api-reference/geoblock | Почему не строим на их CLOB для РФ |
| Gamma OpenAPI | https://docs.polymarket.com/api-spec/gamma-openapi.yaml | Read-only каталог (C6) |
| Contracts | https://docs.polymarket.com/resources/contracts | Адреса на Polygon |

---

## 4. Что писать самим (не ждать OSS)

| Компонент | Причина |
|-----------|---------|
| Matching engine (off-chain) | У Polymarket сервер закрыт; у нас — `place_order` в PostgreSQL, далее свой сервис |
| Учёт виртуального USD | Специфика MVP |
| Админка резолва | Наш процесс доверия |
| RU контент и compliance | Нет в OSS |

---

## 5. Матрица «блок → OSS»

| Блок [PROJECT.md](./PROJECT.md) | OSS |
|---------------------------------|-----|
| B3–B7 | Свой код; идеи MM из `poly-market-maker` |
| C6 | Gamma API только чтение |
| E5–E6 | `ctf-exchange-v2`, CTF, `uma-ctf-adapter` |
| E7 | `poly-market-maker` (адаптация) |
| D3 | Паттерны из privy/wagmi examples |

---

## 6. Чеклист перед использованием нового репо

- [ ] Лицензия совместима с нашим проектом  
- [ ] Репозиторий активен (коммиты < 12 мес.)  
- [ ] Не тянет зависимость от **их** CLOB для core path  
- [ ] Зафиксирована версия / commit SHA в research note  
- [ ] Секреты не из их demo `.env`

---

*Версия реестра: 2026-05-16*
