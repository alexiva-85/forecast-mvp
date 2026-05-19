import Link from "next/link";

export function AdminResolveReminderBanner({
  count,
  staleCount,
}: {
  count: number;
  staleCount: number;
}) {
  if (count <= 0) return null;

  const staleNote =
    staleCount > 0
      ? ` · ${staleCount} ждут резолва более 7 дней`
      : "";

  return (
    <div
      role="status"
      className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3"
    >
      <p className="text-sm font-medium text-amber-100">
        {count === 1
          ? "1 рынок ждёт резолва"
          : `${count} рынков ждут резолва`}
        {staleNote}
      </p>
      <p className="mt-1 text-xs text-amber-200/80">
        Торги закрыты — зафиксируйте исход, чтобы пользователи могли выкупить
        доли.
      </p>
      <Link
        href="/admin/resolve"
        className="mt-2 inline-block text-xs font-medium text-amber-300 underline-offset-2 hover:underline"
      >
        Открыть очередь резолва →
      </Link>
    </div>
  );
}
