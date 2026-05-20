import { formatFeePercent } from "@/lib/platform";
import type { AdminFeeRateHistoryEntry } from "@/lib/admin";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminFeeRateHistory({
  entries,
}: {
  entries: AdminFeeRateHistoryEntry[];
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
      <h2 className="text-lg font-medium text-white">История ставки комиссии</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Изменения для комплаенса и разбора споров
      </p>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">
          Записей пока нет. История появится после первого изменения ставки.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-800">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm text-zinc-200">
                  {formatFeePercent(entry.old_rate)} →{" "}
                  {formatFeePercent(entry.new_rate)}
                </p>
                <p className="text-xs text-zinc-500">
                  {entry.admin_display_name ?? "Оператор"}
                </p>
              </div>
              <time className="text-xs text-zinc-600">
                {formatTime(entry.created_at)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
