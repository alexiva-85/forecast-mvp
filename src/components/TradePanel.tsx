"use client";

import { useState, useTransition } from "react";
import {
  placeMarketOrder,
  placeOrder,
  redeemPositions,
} from "@/app/actions/trading";
import type { MarketOrderResult } from "@/app/actions/trading";
import { formatOutcomeLabel } from "@/lib/outcomes";
import type { MarketWithPrice } from "@/lib/types";
import { formatPrice } from "@/lib/markets";
import {
  estimateSideFee,
  estimateTradeFee,
  formatFeePercent,
} from "@/lib/platform";
import { HelpHint } from "@/components/HelpHint";
import { EXECUTION_INLINE, TRADE_HINTS } from "@/components/trade-hints";

type OrderMode = "limit" | "market";
type MarketTif = "fok" | "ioc";

export function TradePanel({
  market,
  userId,
  outcomeShares,
  tradeFeeRate,
}: {
  market: MarketWithPrice;
  userId: string | null;
  outcomeShares: Record<string, number>;
  tradeFeeRate: number;
}) {
  const defaultOutcome = market.outcomes[0]?.outcome_key ?? "yes";
  const [side, setSide] = useState(defaultOutcome);
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [orderMode, setOrderMode] = useState<OrderMode>("limit");
  const [marketTif, setMarketTif] = useState<MarketTif>("ioc");
  const outcomePrice = (key: string) =>
    market.outcome_prices[key] ??
    (key === "yes" ? market.yes_price : key === "no" ? 1 - market.yes_price : 0.5);

  const [price, setPrice] = useState(outcomePrice(defaultOutcome));
  const [size, setSize] = useState(10);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isOpen = market.status === "open";
  const isResolved = market.status === "resolved";
  const refPrice = outcomePrice(side);
  const estPrice = orderMode === "market" ? refPrice : price;
  const notional = estPrice * size;
  const totalFee = estimateTradeFee(notional, tradeFeeRate);
  const sideFee = estimateSideFee(notional, tradeFeeRate);

  function onSideChange(next: string) {
    setSide(next);
    setPrice(outcomePrice(next));
  }

  function formatMarketResult(result: MarketOrderResult): string {
    const { filled, requested, avgPrice, timeInForce } = result;
    if (filled <= 0) {
      return timeInForce === "fok"
        ? "FOK: нет исполнения — ордер отменён"
        : "IOC: нет исполнения в стакане";
    }
    const avg =
      avgPrice != null ? ` по ~${formatPrice(avgPrice)}` : "";
    if (filled >= requested) {
      return `Исполнено ${filled} долей${avg}`;
    }
    return `Исполнено ${filled} из ${requested}${avg}`;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) {
      setMessage("Войдите, чтобы торговать");
      return;
    }
    setMessage(null);
    const formData = new FormData();
    formData.set("marketId", market.id);
    formData.set("slug", market.slug);
    formData.set("side", side);
    formData.set("direction", direction);
    formData.set("size", String(size));

    startTransition(async () => {
      if (orderMode === "market") {
        formData.set("timeInForce", marketTif);
        const result = await placeMarketOrder(formData);
        if (result.error) setMessage(result.error);
        else if (result.result) setMessage(formatMarketResult(result.result));
        return;
      }

      formData.set("price", String(price));
      const result = await placeOrder(formData);
      if (result.error) setMessage(result.error);
      else setMessage("Лимитный ордер размещён");
    });
  }

  function handleRedeem() {
    startTransition(async () => {
      const result = await redeemPositions(market.id, market.slug);
      if (result.error) setMessage(result.error);
      else setMessage(`Выплачено $${result.payout}`);
    });
  }

  const submitLabel =
    orderMode === "market"
      ? direction === "buy"
        ? "Купить по рынку"
        : "Продать по рынку"
      : direction === "buy"
        ? "Купить"
        : "Продать";

  const marketExecutionBlock = (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-zinc-500">Исполнение</span>
        <HelpHint label="IOC и FOK" align="start">
          {TRADE_HINTS.execution}
        </HelpHint>
      </div>
      <div className="flex gap-2">
        {(["ioc", "fok"] as const).map((tif) => (
          <button
            key={tif}
            type="button"
            onClick={() => setMarketTif(tif)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium uppercase tracking-wide ${
              marketTif === tif
                ? "bg-zinc-700 text-white"
                : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tif}
          </button>
        ))}
      </div>
      <p className="text-xs leading-snug text-zinc-500">
        {EXECUTION_INLINE[marketTif]}
      </p>
    </div>
  );

  if (isResolved) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <p className="text-sm text-zinc-400">
          Исход:{" "}
          <span className="font-medium text-white">
            {formatOutcomeLabel(
              market.resolved_outcome_key ?? market.resolved_side ?? "",
              market.outcomes.find(
                (o) =>
                  o.outcome_key ===
                  (market.resolved_outcome_key ?? market.resolved_side),
              )?.label,
            )}
          </span>
        </p>
        {userId && (
          <button
            type="button"
            onClick={handleRedeem}
            disabled={pending}
            className="mt-4 w-full rounded-lg bg-emerald-500 py-2.5 font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            Получить выплату
          </button>
        )}
        {message && <p className="mt-2 text-sm text-amber-400">{message}</p>}
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-sm text-zinc-500">
        {market.status === "closed"
          ? "Торги закрыты — новые заявки не принимаются"
          : "Торги недоступны"}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex gap-2">
        {(["buy", "sell"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDirection(d)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${
              direction === d
                ? "bg-white text-zinc-900"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {d === "buy" ? "Купить" : "Продать"}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {market.outcomes.map((outcome) => (
          <button
            key={outcome.outcome_key}
            type="button"
            onClick={() => onSideChange(outcome.outcome_key)}
            className={`min-w-[7rem] flex-1 rounded-lg py-2.5 text-sm font-medium ${
              side === outcome.outcome_key
                ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {outcome.label}{" "}
            {formatPrice(outcomePrice(outcome.outcome_key))}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="text-xs text-zinc-500">Тип ордера</span>
          <HelpHint label="Лимит и рынок" align="start">
            {TRADE_HINTS.orderType}
          </HelpHint>
        </div>
        <div className="flex gap-2">
          {(
            [
              ["limit", "Лимит"],
              ["market", "Рынок"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setOrderMode(mode)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                orderMode === mode
                  ? "bg-zinc-700 text-white"
                  : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {orderMode === "market" && (
          <p className="mt-2 text-xs text-zinc-500">
            По лучшим заявкам в стакане · покупка до 99¢, продажа от 1¢
          </p>
        )}
      </div>

      {orderMode === "market" && (
        <div className="mb-4">{marketExecutionBlock}</div>
      )}

      {!userId ? (
        <p className="text-center text-sm text-zinc-500">
          <a href="/login" className="text-emerald-400 hover:underline">
            Войдите
          </a>
          , чтобы торговать
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          {orderMode === "limit" && (
            <div>
              <label className="mb-1 block text-xs text-zinc-500">
                Цена (0.01–0.99)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="0.99"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-white"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              Количество долей
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-white"
            />
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm text-zinc-400">
                {direction === "buy" ? "Списание" : "Доход"}
                <HelpHint label="Оценка и комиссия" align="end">
                  {TRADE_HINTS.estimate}
                </HelpHint>
              </span>
              <span className="text-base font-semibold text-white">
                ${notional.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>
                Комиссия {formatFeePercent(tradeFeeRate)} · ваша ≈ $
                {sideFee.toFixed(2)}
              </span>
            </div>
            <p className="mt-2 border-t border-zinc-800/80 pt-2 text-xs text-zinc-600">
              В портфеле:{" "}
              {market.outcomes
                .map(
                  (o) =>
                    `${o.label} ${outcomeShares[o.outcome_key] ?? 0}`,
                )
                .join(" · ")}
            </p>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-emerald-500 py-3 text-base font-semibold text-zinc-950 shadow-sm shadow-emerald-500/20 hover:bg-emerald-400 disabled:opacity-50"
          >
            {pending ? "..." : submitLabel}
          </button>
        </form>
      )}

      {message && (
        <p
          className={`mt-3 text-sm ${
            message.includes("размещён") ||
            message.includes("Исполнено") ||
            message.includes("Выплачено")
              ? "text-emerald-400"
              : "text-rose-400"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
