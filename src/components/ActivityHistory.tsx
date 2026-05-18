import Link from "next/link";
import type { ActivityRow } from "@/lib/activity";
import {
  activityAmountClass,
  describeActivity,
  formatActivityAmount,
  formatActivityDate,
} from "@/lib/activity";
import { ActivityBadge } from "@/components/ActivityBadge";

export function ActivityHistory({
  activities,
  outcomeLabelsBySlug = {},
}: {
  activities: ActivityRow[];
  outcomeLabelsBySlug?: Record<string, Record<string, string>>;
}) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        Пока нет сделок и операций — история появится после торговли.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs text-zinc-500">
        Последние {activities.length} операций
      </p>
      <ul className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-zinc-900/40">
        {activities.map((row) => {
          const view = describeActivity(row, outcomeLabelsBySlug);
          return (
            <li
              key={row.event_id}
              className="flex items-start justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <ActivityBadge
                    label={view.badgeLabel}
                    variant={view.badgeVariant}
                  />
                  <span className="text-xs text-zinc-600">
                    {formatActivityDate(row.event_at)}
                  </span>
                </div>
                {view.detailLine && (
                  <p className="mt-1 text-sm leading-snug text-zinc-300">
                    {view.marketSlug ? (
                      <Link
                        href={`/market/${view.marketSlug}`}
                        className="hover:text-emerald-400"
                      >
                        {view.detailLine}
                      </Link>
                    ) : (
                      view.detailLine
                    )}
                  </p>
                )}
                {row.fee != null && row.fee > 0 && (
                  <p className="mt-0.5 text-xs text-zinc-600">
                    Комиссия ${row.fee.toFixed(2)}
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 text-sm font-semibold tabular-nums ${activityAmountClass(row.amount)}`}
              >
                {formatActivityAmount(row.amount)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
