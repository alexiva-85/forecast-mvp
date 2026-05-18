import Link from "next/link";
import type { ActivityRow } from "@/lib/activity";
import {
  activityTypeLabel,
  formatActivityAmount,
  formatActivityDate,
  formatActivityDetail,
} from "@/lib/activity";

export function ActivityHistory({ activities }: { activities: ActivityRow[] }) {
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
        {activities.map((row) => (
          <li
            key={row.event_id}
            className="flex items-start justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-zinc-200">
                  {activityTypeLabel(row.event_type)}
                </span>
                <span className="text-xs text-zinc-600">
                  {formatActivityDate(row.event_at)}
                </span>
              </div>
              {row.market_title && row.market_slug && (
                <Link
                  href={`/market/${row.market_slug}`}
                  className="mt-0.5 block truncate text-sm text-zinc-400 hover:text-emerald-400"
                >
                  {row.market_title}
                </Link>
              )}
              <p className="mt-0.5 text-xs text-zinc-500">
                {formatActivityDetail(row)}
                {row.fee != null && row.fee > 0 && (
                  <span className="text-zinc-600">
                    {" "}
                    · комиссия ${row.fee.toFixed(2)}
                  </span>
                )}
              </p>
            </div>
            <span
              className={`shrink-0 text-sm font-medium tabular-nums ${
                row.amount != null && row.amount > 0
                  ? "text-emerald-400"
                  : row.amount != null && row.amount < 0
                    ? "text-zinc-300"
                    : "text-zinc-600"
              }`}
            >
              {formatActivityAmount(row.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
