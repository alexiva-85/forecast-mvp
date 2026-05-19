"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  describeMarketTrade,
  describeOpenOrder,
  formatTradeNotional,
} from "@/lib/portfolio-ui";
import { formatOutcomeLabel } from "@/lib/outcomes";
import { UiListRow } from "@/components/UiListRow";

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
}: {
  marketId: string;
  initialOrders: BookRow[];
  initialTrades: TradeRow[];
  outcomeLabels?: Record<string, string>;
}) {
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
          <ul className="divide-y divide-zinc-800/50">
            {orders.map((o, i) => {
              const { actionLine, termsLine } = describeOpenOrder(
                o.direction as "buy" | "sell",
                o.side,
                o.remaining,
                o.price,
                labelFor(o.side),
              );
              return (
                <li key={`${o.side}-${o.direction}-${o.price}-${i}`} className="py-2.5">
                  <UiListRow
                    actionLine={actionLine}
                    termsLine={termsLine}
                    right={
                      <span className="text-sm font-semibold tabular-nums text-zinc-300">
                        {o.remaining}
                      </span>
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </LiveSection>

      <LiveSection title="Последние сделки">
        {!trades.length ? (
          <p className="text-sm text-zinc-600">Сделок пока нет</p>
        ) : (
          <ul className="divide-y divide-zinc-800/50">
            {trades.map((t) => {
              const { actionLine, termsLine, notional } = describeMarketTrade(
                t.side,
                t.size,
                t.price,
                labelFor(t.side),
              );
              return (
                <li key={t.id} className="py-2.5">
                  <UiListRow
                    actionLine={actionLine}
                    termsLine={
                      t.fee_amount > 0
                        ? `${termsLine} · ком. $${t.fee_amount.toFixed(2)}`
                        : termsLine
                    }
                    right={
                      <span className="text-sm font-semibold tabular-nums text-zinc-400">
                        {formatTradeNotional(notional)}
                      </span>
                    }
                  />
                </li>
              );
            })}
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
          онлайн
        </span>
      </div>
      {children}
    </div>
  );
}
