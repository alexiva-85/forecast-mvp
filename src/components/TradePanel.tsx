"use client";

import { useState, useTransition } from "react";
import { placeOrder, redeemPositions } from "@/app/actions/trading";
import type { MarketWithPrice } from "@/lib/types";
import { formatPrice } from "@/lib/markets";
import {
  estimateSideFee,
  estimateTradeFee,
  formatFeePercent,
} from "@/lib/platform";

export function TradePanel({
  market,
  userId,
  yesShares,
  noShares,
  tradeFeeRate,
}: {
  market: MarketWithPrice;
  userId: string | null;
  yesShares: number;
  noShares: number;
  tradeFeeRate: number;
}) {
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState(
    side === "yes" ? market.yes_price : 1 - market.yes_price,
  );
  const [size, setSize] = useState(10);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isOpen = market.status === "open";
  const isResolved = market.status === "resolved";
  const notional = price * size;
  const totalFee = estimateTradeFee(notional, tradeFeeRate);
  const sideFee = estimateSideFee(notional, tradeFeeRate);

  function onSideChange(next: "yes" | "no") {
    setSide(next);
    setPrice(next === "yes" ? market.yes_price : 1 - market.yes_price);
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
    formData.set("price", String(price));
    formData.set("size", String(size));

    startTransition(async () => {
      const result = await placeOrder(formData);
      if (result.error) setMessage(result.error);
      else setMessage("Ордер размещён");
    });
  }

  function handleRedeem() {
    startTransition(async () => {
      const result = await redeemPositions(market.id, market.slug);
      if (result.error) setMessage(result.error);
      else setMessage(`Выплачено $${result.payout}`);
    });
  }

  if (isResolved) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <p className="text-sm text-zinc-400">
          Исход:{" "}
          <span className="font-medium text-white">
            {market.resolved_side === "yes" ? "Да" : "Нет"}
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
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              direction === d
                ? "bg-white text-zinc-900"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {d === "buy" ? "Купить" : "Продать"}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => onSideChange("yes")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${
            side === "yes"
              ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40"
              : "bg-zinc-800 text-zinc-400"
          }`}
        >
          Да {formatPrice(market.yes_price)}
        </button>
        <button
          type="button"
          onClick={() => onSideChange("no")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${
            side === "no"
              ? "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40"
              : "bg-zinc-800 text-zinc-400"
          }`}
        >
          Нет {formatPrice(1 - market.yes_price)}
        </button>
      </div>

      {!userId ? (
        <p className="text-center text-sm text-zinc-500">
          <a href="/login" className="text-emerald-400 hover:underline">
            Войдите
          </a>
          , чтобы торговать
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              Лимитная цена (0.01–0.99)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="0.99"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            />
          </div>
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
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            />
          </div>
          <p className="text-xs text-zinc-500">
            В портфеле: Да {yesShares} · Нет {noShares}
          </p>
          <p className="text-xs text-zinc-500">
            {direction === "buy" ? "Макс. списание" : "Ожидаемый доход"}: $
            {(price * size).toFixed(2)}
          </p>
          <p className="text-xs text-zinc-600">
            Комиссия {formatFeePercent(tradeFeeRate)} с оборота при исполнении
            (ваша доля ≈ ${sideFee.toFixed(2)}, всего ${totalFee.toFixed(2)})
          </p>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-emerald-500 py-2.5 font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {pending ? "..." : direction === "buy" ? "Купить" : "Продать"}
          </button>
        </form>
      )}
      {message && (
        <p
          className={`mt-2 text-sm ${message.includes("размещён") || message.includes("Выплачено") ? "text-emerald-400" : "text-rose-400"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
