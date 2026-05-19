import Link from "next/link";
import { MarketStatusChip } from "@/components/MarketStatusChip";
import { UiListRow } from "@/components/UiListRow";
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
        const shareCount = formatShareCount(Number(p.shares));

        return (
          <li
            key={`${p.market_id}-${p.side}`}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
          >
            <UiListRow
              actionLine={`Позиция: ${outcomeName}`}
              termsLine={
                <>
                  <Link
                    href={`/market/${m.slug}`}
                    className="hover:text-emerald-400"
                  >
                    {m.title}
                  </Link>
                  {" · "}
                  {shareCount}
                </>
              }
              right={<MarketStatusChip status={m.status} />}
            />
            {m.status === "resolved" && resolvedKey && (
              <p className="mt-3 text-xs text-amber-400">
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
