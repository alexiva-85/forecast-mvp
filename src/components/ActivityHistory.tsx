import Link from "next/link";
import type { ActivityRow } from "@/lib/activity";
import {
  activityAmountClass,
  describeActivity,
  formatActivityAmount,
  formatActivityDate,
} from "@/lib/activity";
import { UiListRow } from "@/components/UiListRow";

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
          const termsLine =
            view.termsLine && view.marketSlug ? (
              <Link
                href={`/market/${view.marketSlug}`}
                className="hover:text-emerald-400"
              >
                {view.termsLine}
              </Link>
            ) : (
              view.termsLine
            );

          return (
            <li key={row.event_id} className="px-4 py-3">
              <UiListRow
                actionLine={view.actionLine}
                termsLine={termsLine}
                meta={formatActivityDate(row.event_at)}
                right={
                  <span
                    className={`text-sm font-semibold tabular-nums ${activityAmountClass(row.amount)}`}
                  >
                    {formatActivityAmount(row.amount)}
                  </span>
                }
              />
              {row.fee != null && row.fee > 0 && (
                <p className="mt-1 text-right text-xs text-zinc-600">
                  Комиссия ${row.fee.toFixed(2)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
