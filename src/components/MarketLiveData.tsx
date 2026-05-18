"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/markets";
import { formatOutcomeLabel } from "@/lib/outcomes";

type BookRow = {
  side: string;
  direction: string;
  price: number;
  remaining: number;
};

type TradeRow = {
  id: string;
  side: string;
  price: number;
  size: number;
  fee_amount: number;
};

export function MarketLiveData({
  marketId,
  initialOrders,
  initialTrades,
  outcomeLabels = {},
  isMulti = false,
}: {
  marketId: string;
  initialOrders: BookRow[];
  initialTrades: TradeRow[];
  outcomeLabels?: Record<string, string>;
  isMulti?: boolean;
}) {
  const outcomeColumn = isMulti ? "Исход" : "Сторона";

  function labelFor(side: string) {
    return formatOutcomeLabel(side, outcomeLabels?.[side]);
  }
  const [orders, setOrders] = useState(initialOrders);
  const [trades, setTrades] = useState(initialTrades);

  useEffect(() => {
    const supabase = createClient();

    async function refresh() {
      const [{ data: orderData }, { data: tradeData }] = await Promise.all([
        supabase
          .from("orders")
          .select("side, direction, price, remaining")
          .eq("market_id", marketId)
          .eq("status", "open")
          .order("price", { ascending: false }),
        supabase
          .from("trades")
          .select("id, side, price, size, fee_amount")
          .eq("market_id", marketId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (orderData) {
        setOrders(
          orderData.map((o) => ({
            side: o.side,
            direction: o.direction,
            price: Number(o.price),
            remaining: Number(o.remaining),
          })),
        );
      }
      if (tradeData) {
        setTrades(
          tradeData.map((t) => ({
            id: t.id,
            side: t.side,
            price: Number(t.price),
            size: Number(t.size),
            fee_amount: Number(t.fee_amount ?? 0),
          })),
        );
      }
    }

    const channel = supabase
      .channel(`market-${marketId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `market_id=eq.${marketId}`,
        },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trades",
          filter: `market_id=eq.${marketId}`,
        },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [marketId]);

  return (
    <>
      <LiveSection title="Стакан">
        {!orders.length ? (
          <p className="text-sm text-zinc-600">Нет открытых заявок</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500">
                <th className="pb-2">{outcomeColumn}</th>
                <th className="pb-2">Тип</th>
                <th className="pb-2">Цена</th>
                <th className="pb-2 text-right">Объём</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, i) => (
                <tr
                  key={`${o.side}-${o.direction}-${o.price}-${i}`}
                  className="border-t border-zinc-800/50"
                >
                  <td className="py-2">{labelFor(o.side)}</td>
                  <td className="py-2">
                    {o.direction === "buy" ? "Покупка" : "Продажа"}
                  </td>
                  <td className="py-2">{formatPrice(o.price)}</td>
                  <td className="py-2 text-right">{o.remaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </LiveSection>

      <LiveSection title="Последние сделки">
        {!trades.length ? (
          <p className="text-sm text-zinc-600">Сделок пока нет</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {trades.map((t) => (
              <li
                key={t.id}
                className="flex justify-between border-b border-zinc-800/50 pb-2"
              >
                <span>
                  {labelFor(t.side)} · {formatPrice(t.price)}
                </span>
                <span className="text-zinc-500">
                  {t.size} долей
                  {t.fee_amount > 0 && ` · ком. $${t.fee_amount.toFixed(2)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </LiveSection>
    </>
  );
}

function LiveSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-medium text-zinc-400">{title}</h2>
        <span className="inline-flex items-center gap-1 text-xs text-emerald-500/80">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          live
        </span>
      </div>
      {children}
    </div>
  );
}
