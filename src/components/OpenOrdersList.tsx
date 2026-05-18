"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cancelOrder } from "@/app/actions/trading";
import { describeOpenOrder } from "@/lib/portfolio-ui";
import type { Order } from "@/lib/types";

export type OpenOrderRow = Order & {
  markets?: { slug: string; title: string } | null;
};

export function OpenOrdersList({
  userId,
  marketId,
  slug,
  initialOrders,
  showMarket = false,
  showHeading = true,
  outcomeLabels,
  outcomeLabelsByMarket,
}: {
  userId: string;
  marketId?: string;
  slug?: string;
  initialOrders: OpenOrderRow[];
  showMarket?: boolean;
  showHeading?: boolean;
  outcomeLabels?: Record<string, string>;
  outcomeLabelsByMarket?: Record<string, Record<string, string>>;
}) {
  function labelForOrder(order: OpenOrderRow): string | undefined {
    if (outcomeLabels) return outcomeLabels[order.side];
    if (outcomeLabelsByMarket) {
      return outcomeLabelsByMarket[order.market_id]?.[order.side];
    }
    return undefined;
  }

  const [orders, setOrders] = useState(initialOrders);
  const [pending, startTransition] = useTransition();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function refresh() {
      let query = supabase
        .from("orders")
        .select("*, markets(slug, title)")
        .eq("user_id", userId)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (marketId) {
        query = query.eq("market_id", marketId);
      }

      const { data } = await query;
      if (data) setOrders(data as OpenOrderRow[]);
    }

    const filter = marketId
      ? `market_id=eq.${marketId}`
      : `user_id=eq.${userId}`;

    const channel = supabase
      .channel(`open-orders-${userId}-${marketId ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, marketId]);

  function handleCancel(orderId: string, orderSlug?: string) {
    setMessage(null);
    setCancellingId(orderId);
    startTransition(async () => {
      const result = await cancelOrder(orderId, orderSlug ?? slug);
      setCancellingId(null);
      if (result.error) {
        setMessage(result.error);
      } else {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        setMessage("Заявка отменена");
      }
    });
  }

  if (!orders.length) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      {showHeading && (
        <h2 className="mb-3 text-sm font-medium text-zinc-400">Мои заявки</h2>
      )}
      <ul className="space-y-2">
        {orders.map((o) => {
          const { actionLine, termsLine } = describeOpenOrder(
            o.direction as "buy" | "sell",
            o.side,
            Number(o.remaining),
            Number(o.price),
            labelForOrder(o),
          );
          return (
            <li
              key={o.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-zinc-950/50 px-3 py-2.5"
            >
              <div className="min-w-0">
                {showMarket && o.markets && (
                  <Link
                    href={`/market/${o.markets.slug}`}
                    className="mb-0.5 block truncate text-xs text-zinc-500 hover:text-emerald-400"
                  >
                    {o.markets.title}
                  </Link>
                )}
                <p className="text-sm font-medium text-white">{actionLine}</p>
                <p className="text-xs text-zinc-500">{termsLine}</p>
              </div>
              <button
                type="button"
                onClick={() => handleCancel(o.id, o.markets?.slug)}
                disabled={pending && cancellingId === o.id}
                className="shrink-0 rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:border-rose-500/50 hover:text-rose-400 disabled:opacity-50"
              >
                {pending && cancellingId === o.id ? "..." : "Отменить"}
              </button>
            </li>
          );
        })}
      </ul>
      {message && (
        <p
          className={`mt-2 text-xs ${message.includes("отменен") ? "text-emerald-400" : "text-rose-400"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
