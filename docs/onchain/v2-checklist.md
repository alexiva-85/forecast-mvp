# CLOB / CTF V2 — чеклист для Forecast (E5)

Сжатый чеклист по [v2-migration](https://docs.polymarket.com/v2-migration). Полный research: [2026-05-20.md](../research/2026-05-20.md).

## Перед деплоем / интеграцией

- [x] Pin `ctf-exchange-v2` commit SHA → `contracts/VENDOR.lock`
- [x] Прочитать v2-migration (fee на матче, pUSD, domain `"2"`)
- [x] Зафиксировать Amoy reference addresses → `contracts/addresses/amoy-reference.json`
- [ ] Forecast-owned Exchange на Amoy (опционально) → `amoy-forecast.json`
- [ ] Operator wallet + роли `admin` / `operator` на Exchange

## Контракты и коллатерал

| V1 | V2 (Forecast testnet) |
|----|------------------------|
| USDC.e | pUSD proxy `0xC011…` (Amoy reference) |
| Exchange domain `"1"` | **`"2"`** |
| `feeRateBps` в подписи ордера | Fee operator-set at `matchOrders` |
| `nonce` в ордере | `timestamp` (ms) |
| CLOB v1 SDK | **Не использовать** |

## EIP-712 (Exchange)

```text
name:    Polymarket CTF Exchange
version: 2
chainId: 80002 (Amoy) / 137 (mainnet)
verifyingContract: ctfExchange из addresses JSON
```

Neg-risk markets: отдельный `verifyingContract` (`negRiskCtfExchange`).

## Order struct (подпись)

Добавлены: `timestamp`, `metadata`, `builder`.  
Убраны из подписи: `taker`, `expiration`, `nonce`, `feeRateBps`.

## Off-chain ↔ on-chain bridge (MVP)

| Слой | Статус E5 |
|------|-----------|
| Matcher, ledger, fee | PostgreSQL (`done`, B6/F1) |
| Подпись ордеров V2 | Заготовка `src/lib/onchain/bridge-stub.ts` |
| `matchOrders` on-chain | E5+ / отдельный operator-сервис |
| Резолв | E6 (`uma-ctf-adapter`) |

## Smoke (минимум)

- [x] Read-only: bytecode Exchange + CTF на Amoy (`npm run onchain:smoke`)
- [ ] Write: wrap → split (нужен test MATIC + pUSD/USDC на Amoy)
- [ ] Один signed order + operator match (после operator-сервиса)

## Явно не делаем

- Production Polymarket CLOB для РФ-аудитории
- `@polymarket/clob-client` / `py-clob-client` v1
- Mainnet deploy без G5 audit
