import Link from "next/link";
import type { MarketWithPrice } from "@/lib/types";
import { categoryLabel, formatPrice, formatClosesAt } from "@/lib/markets";

export function MarketCard({
  market,
  activeTag,
}: {
  market: MarketWithPrice;
  activeTag?: string;
}) {
  const noPrice = Math.round((1 - market.yes_price) * 100) / 100;

  return (
    <Link
      href={`/market/${market.slug}`}
      className="group block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-zinc-600 hover:bg-zinc-900"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
          {categoryLabel(market.category)}
        </span>
        {market.status === "closed" && (
          <span className="rounded-md bg-zinc-700/80 px-2 py-0.5 text-xs text-zinc-300">
            Торги закрыты
          </span>
        )}
        {market.status === "resolved" && (
          <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">
            Завершён
          </span>
        )}
      </div>
      <h2 className="text-base font-medium leading-snug text-white group-hover:text-emerald-50">
        {market.title}
      </h2>
      {market.status === "open" && formatClosesAt(market.closes_at) && (
        <p className="mt-2 text-xs text-zinc-500">
          Торги до {formatClosesAt(market.closes_at)}
        </p>
      )}
      {market.tags?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {market.tags.slice(0, 4).map((t) => (
            <span
              key={t}
              className={`rounded px-1.5 py-0.5 text-[10px] ${
                activeTag === t
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-zinc-800 text-zinc-500"
              }`}
            >
              #{t}
            </span>
          ))}
        </div>
      )}
      <div className="mt-4 flex gap-3">
        <div className="flex-1 rounded-lg bg-emerald-500/10 px-3 py-2 text-center">
          <p className="text-xs text-emerald-500/80">Да</p>
          <p className="text-lg font-semibold text-emerald-400">
            {formatPrice(market.yes_price)}
          </p>
        </div>
        <div className="flex-1 rounded-lg bg-rose-500/10 px-3 py-2 text-center">
          <p className="text-xs text-rose-500/80">Нет</p>
          <p className="text-lg font-semibold text-rose-400">
            {formatPrice(noPrice)}
          </p>
        </div>
      </div>
    </Link>
  );
}
