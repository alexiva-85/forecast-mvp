# On-chain contracts (E5)

Forecast testnet settlement uses a **pinned fork** of [Polymarket/ctf-exchange-v2](https://github.com/Polymarket/ctf-exchange-v2) (MIT). Off-chain matcher (PostgreSQL) остаётся источником истины в MVP; on-chain — параллельный контур для smoke и будущего bridge (E6).

## Pin

| Поле | Значение |
|------|----------|
| Репозиторий | `Polymarket/ctf-exchange-v2` |
| Commit | `ccc0596074f4dfd62c944fbca4de252893b82b4b` (`contracts/VENDOR.lock`) |
| Research baseline | `v1.0.6` (2026-05-20) — upstream без git-тега, только SHA |
| EIP-712 domain | `"Polymarket CTF Exchange"`, version **`"2"`** |

Синхронизация исходников:

```bash
npm run onchain:vendor   # clone/checkout в contracts/vendor/ctf-exchange-v2
```

Требуется [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`).

## Сеть: Polygon Amoy (80002)

**Референсный стек** (уже задеплоен Polymarket, vanity CREATE2) — `contracts/addresses/amoy-reference.json`.  
Используется для smoke и интеграционных тестов без своего деплоя.

**Свой Exchange** (опционально): скопируйте `amoy-forecast.template.json` → `amoy-forecast.json`, задеплойте Exchange с вашим `ADMIN` / `FEE_RECEIVER`, заполните адреса (файл в `.gitignore`).

## Деплой Forecast Exchange (опционально)

1. `npm run onchain:vendor`
2. `cp contracts/.env.testnet.example contracts/vendor/ctf-exchange-v2/.env.testnet`
3. Заполните `PK`, `ADMIN`, `FEE_RECEIVER` (секреты **не** в git)
4. Из корня репо:

```bash
npm run onchain:deploy:exchange
```

Скрипт вызывает upstream `deploy/scripts/deploy_exchange.sh testnet` с зависимостями Amoy из reference JSON.

После деплоя сохраните адрес Exchange в `contracts/addresses/amoy-forecast.json`.

## Smoke

```bash
# read-only: bytecode + getters на Amoy (public RPC)
npm run onchain:smoke

# опционально write: split/mint (нужен funded wallet)
ONCHAIN_SMOKE_WRITE=1 ONCHAIN_DEPLOYER_PK=0x... npm run onchain:smoke
```

## Env (приложение / скрипты)

См. корневой `.env.example` — префиксы `ONCHAIN_*`, `NEXT_PUBLIC_ONCHAIN_*`. Секреты только локально / Vercel, не в git.

## Документация

- [docs/onchain/E5.md](../docs/onchain/E5.md) — scope, bridge-stub, следующие шаги
- [docs/onchain/v2-checklist.md](../docs/onchain/v2-checklist.md) — чеклист v2-migration для Forecast
- [docs/research/2026-05-20.md](../docs/research/2026-05-20.md) — research pass

## Не в scope E5

- Polymarket production CLOB (`clob.polymarket.com`) для исполнения в РФ
- `@polymarket/clob-client` v1
- Полный MM-бот (E7)
