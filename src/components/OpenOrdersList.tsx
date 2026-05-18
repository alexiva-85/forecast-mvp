"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cancelOrder } from "@/app/actions/trading";
import { formatPrice } from "@/lib/markets";
import { formatOutcomeLabel } from "@/lib/outcomes";
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
  outcomeLabels,
}: {
  userId: string;
  marketId?: string;
  slug?: string;
  initialOrders: OpenOrderRow[];
  showMarket?: boolean;
  outcomeLabels?: Record<string, string>;
}) {
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
        setMessage("Ордер отменён");
      }
    });
  }

  if (!orders.length) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h2 className="mb-3 text-sm font-medium text-zinc-400">Мои заявки</h2>
      <ul className="space-y-2">
        {orders.map((o) => (
          <li
            key={o.id}
            className="flex items-center justify-between gap-3 rounded-lg bg-zinc-950/50 px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              {showMarket && o.markets && (
                <Link
                  href={`/market/${o.markets.slug}`}
                  className="block truncate font-medium text-white hover:text-emerald-400"
                >
                  {o.markets.title}
                </Link>
              )}
              <span className="text-zinc-300">
                {formatOutcomeLabel(o.side, outcomeLabels?.[o.side])} ·{" "}
                {o.direction === "buy" ? "Покупка" : "Продажа"}{" "}
                · {formatPrice(Number(o.price))} · {o.remaining} долей
              </span>
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
        ))}
      </ul>
      {message && (
        <p
          className={`mt-2 text-xs ${message.includes("отменён") ? "text-emerald-400" : "text-rose-400"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
