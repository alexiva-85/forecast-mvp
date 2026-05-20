import Link from "next/link";
import {
  type AdminOrderRow as Order,
  orderKindLabel,
  orderStatusChipClass,
  orderStatusLabel,
} from "@/lib/admin-trading";
import { describeOpenOrder, formatTradeNotional } from "@/lib/portfolio-ui";

function formatAdminTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminOrderRow({ order }: { order: Order }) {
  const filledSize = order.size - order.remaining;
  const displaySize =
    order.status === "open" ? order.remaining : filledSize || order.size;
  const { actionLine, termsLine } = describeOpenOrder(
    order.direction,
    order.side,
    displaySize,
    order.price,
    order.outcome_label,
  );
  const notional = Math.round(displaySize * order.price * 100) / 100;

  return (
    <li className="px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium text-zinc-100">{actionLine}</p>
          <p className="text-xs text-zinc-500">{termsLine}</p>
          <p className="text-xs text-zinc-500">
            <Link
              href={`/market/${order.market_slug}`}
              className="text-amber-400/90 hover:underline"
            >
              {order.market_title}
            </Link>
            {" · "}
            <span className="text-zinc-600">{order.market_slug}</span>
          </p>
          <p className="text-xs text-zinc-600">
            {order.user_display_name ?? "Без имени"}
            {order.user_email ? ` · ${order.user_email}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`rounded-md px-2 py-0.5 ${orderStatusChipClass(order.status)}`}
            >
              {orderStatusLabel(order.status)}
            </span>
            <span className="text-zinc-500">{orderKindLabel(order.order_kind)}</span>
            {order.order_kind === "limit" && order.time_in_force !== "gtc" && (
              <span className="uppercase text-zinc-600">
                {order.time_in_force}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right text-xs text-zinc-500">
          <p className="tabular-nums text-zinc-300">
            {formatTradeNotional(notional)}
          </p>
          <p className="mt-0.5">{formatAdminTime(order.created_at)}</p>
          <p className="mt-0.5 font-mono text-[10px] text-zinc-700">
            {order.id.slice(0, 8)}…
          </p>
        </div>
      </div>
    </li>
  );
}
