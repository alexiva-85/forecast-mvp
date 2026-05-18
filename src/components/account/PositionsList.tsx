import Link from "next/link";
import { MarketStatusChip } from "@/components/MarketStatusChip";
import { formatOutcomeLabel, resolvedOutcomeKey } from "@/lib/outcomes";
import { formatShareCount } from "@/lib/portfolio-ui";
import type { MarketStatus } from "@/lib/types";

export type PositionRow = {
  market_id: string;
  side: string;
  shares: number;
  markets: {
    slug: string;
    title: string;
    status: MarketStatus;
    resolved_side: string | null;
    resolved_outcome_key?: string | null;
  };
};

export function PositionsList({
  positions,
  outcomeLabelsByMarketId,
}: {
  positions: PositionRow[];
  outcomeLabelsByMarketId: Record<string, Record<string, string>>;
}) {
  if (positions.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        Нет открытых позиций — купите доли на странице рынка.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {positions.map((p) => {
        const m = p.markets;
        const labels = outcomeLabelsByMarketId[p.market_id];
        const resolvedKey = resolvedOutcomeKey(m);
        const outcomeName = formatOutcomeLabel(p.side, labels?.[p.side]);

        return (
          <li
            key={`${p.market_id}-${p.side}`}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/market/${m.slug}`}
                className="min-w-0 font-medium text-white hover:text-emerald-400"
              >
                {m.title}
              </Link>
              <MarketStatusChip status={m.status} />
            </div>
            <p className="mt-3 text-sm text-zinc-400">
              Ваш исход:{" "}
              <span className="font-medium text-zinc-200">{outcomeName}</span>
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-white">
              {formatShareCount(Number(p.shares))}
            </p>
            {m.status === "resolved" && resolvedKey && (
              <p className="mt-2 text-xs text-amber-400">
                Итог рынка:{" "}
                {formatOutcomeLabel(resolvedKey, labels?.[resolvedKey])} — получите
                $1 за выигрышную долю на странице рынка
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
