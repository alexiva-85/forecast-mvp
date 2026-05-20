import Link from "next/link";
import { type AdminTradeRow as Trade } from "@/lib/admin-trading";
import {
  describeMarketTrade,
  formatTradeNotional,
} from "@/lib/portfolio-ui";

function formatAdminTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminTradeRow({ trade }: { trade: Trade }) {
  const { actionLine, termsLine, notional } = describeMarketTrade(
    trade.side,
    trade.size,
    trade.price,
    trade.outcome_label,
  );

  return (
    <li className="px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium text-zinc-100">{actionLine}</p>
          <p className="text-xs text-zinc-500">{termsLine}</p>
          <p className="text-xs text-zinc-500">
            <Link
              href={`/market/${trade.market_slug}`}
              className="text-amber-400/90 hover:underline"
            >
              {trade.market_title}
            </Link>
            {" · "}
            <span className="text-zinc-600">{trade.market_slug}</span>
          </p>
          <p className="text-xs text-zinc-600">
            Покупатель: {trade.buyer_email ?? trade.buyer_id.slice(0, 8)}
          </p>
          <p className="text-xs text-zinc-600">
            Продавец: {trade.seller_email ?? trade.seller_id.slice(0, 8)}
          </p>
          {trade.fee_amount > 0 && (
            <p className="text-xs text-zinc-600">
              Комиссия: {formatTradeNotional(trade.fee_amount)}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right text-xs text-zinc-500">
          <p className="tabular-nums text-zinc-300">
            {formatTradeNotional(notional)}
          </p>
          <p className="mt-0.5">{formatAdminTime(trade.created_at)}</p>
          <p className="mt-0.5 font-mono text-[10px] text-zinc-700">
            {trade.id.slice(0, 8)}…
          </p>
        </div>
      </div>
    </li>
  );
}
