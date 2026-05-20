import Link from "next/link";
import type { MarketWithPrice } from "@/lib/types";
import { MarketStatusChip } from "@/components/MarketStatusChip";
import { categoryLabel, formatPrice, formatClosesAt } from "@/lib/markets";
import { displayOutcomePrice } from "@/lib/outcomes";
import {
  getMultiOutcomeAccent,
  MULTI_OUTCOME_CARD_PREVIEW,
} from "@/lib/multi-outcome-styles";

export function MarketCard({
  market,
  activeTag,
}: {
  market: MarketWithPrice;
  activeTag?: string;
}) {
  const isMulti =
    market.outcome_mode === "multi" || (market.outcomes?.length ?? 0) > 2;
  const sortedOutcomes = [...(market.outcomes ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return (
    <Link
      href={`/market/${market.slug}`}
      className="group block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-zinc-600 hover:bg-zinc-900"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
          {categoryLabel(market.category)}
        </span>
        <MarketStatusChip status={market.status} />
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
      {isMulti ? (
        <MultiOutcomeCardOutcomes
          outcomes={sortedOutcomes}
          prices={market.outcome_prices}
        />
      ) : (
        <div className="mt-4 flex gap-3">
          <div className="flex-1 rounded-lg bg-emerald-500/10 px-3 py-2 text-center">
            <p className="text-xs text-emerald-500/80">Да</p>
            <p className="text-lg font-semibold text-emerald-400">
              {formatPrice(displayOutcomePrice(market, "yes"))}
            </p>
          </div>
          <div className="flex-1 rounded-lg bg-rose-500/10 px-3 py-2 text-center">
            <p className="text-xs text-rose-500/80">Нет</p>
            <p className="text-lg font-semibold text-rose-400">
              {formatPrice(displayOutcomePrice(market, "no"))}
            </p>
          </div>
        </div>
      )}
    </Link>
  );
}

function MultiOutcomeCardOutcomes({
  outcomes,
  prices,
}: {
  outcomes: MarketWithPrice["outcomes"];
  prices: Record<string, number>;
}) {
  const visible = outcomes.slice(0, MULTI_OUTCOME_CARD_PREVIEW);
  const hiddenCount = outcomes.length - visible.length;

  return (
    <ul className="mt-4 space-y-1.5" aria-label="Исходы">
      {visible.map((outcome, index) => {
        const accent = getMultiOutcomeAccent(index);
        return (
          <li
            key={outcome.outcome_key}
            className={`flex items-center gap-2 rounded-md border border-zinc-800/80 bg-zinc-800/50 py-1.5 pl-2 pr-2.5 border-l-2 ${accent.border}`}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${accent.dot}`}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-xs text-zinc-200">
              {outcome.label}
            </span>
            <span
              className={`shrink-0 text-sm font-semibold tabular-nums ${accent.price}`}
            >
              {formatPrice(prices[outcome.outcome_key] ?? 0.5)}
            </span>
          </li>
        );
      })}
      {hiddenCount > 0 && (
        <li className="pt-0.5 text-center text-[11px] leading-tight text-zinc-500">
          + ещё {hiddenCount}{" "}
          {hiddenCount === 1 ? "исход" : hiddenCount < 5 ? "исхода" : "исходов"}
        </li>
      )}
    </ul>
  );
}
