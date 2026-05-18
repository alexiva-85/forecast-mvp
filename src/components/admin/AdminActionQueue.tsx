import Link from "next/link";
import type { AdminActionItem } from "@/lib/admin";
import { actionKindMeta, adminStatusLabel } from "@/lib/admin";
import { AdminMarketSlug } from "@/components/admin/AdminMarketSlug";
import { categoryLabel } from "@/lib/markets";

export function AdminActionQueue({
  items,
  sandboxUnresolved,
}: {
  items: AdminActionItem[];
  sandboxUnresolved: number;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-5 text-sm text-zinc-500">
        Срочных задач нет — можно создать рынок или проверить активные.
      </p>
    );
  }

  return (
    <section className="space-y-2">
      <ul className="space-y-2">
        {items.map((item) => {
          const meta = actionKindMeta(item.kind);
          const isResolve =
            item.kind === "needs_resolve" || item.kind === "stale_resolve";

          return (
            <li
              key={`${item.kind}-${item.market.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800/90 bg-zinc-900/60 px-4 py-3"
            >
              <section className="min-w-0 flex-1">
                <section className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.tagClass}`}
                  >
                    {meta.tag}
                  </span>
                  <p className="truncate text-sm font-medium text-white">
                    {item.market.title}
                  </p>
                </section>
                <p className={`mt-1 text-xs ${meta.labelClass}`}>{item.label}</p>
                <AdminMarketSlug slug={item.market.slug} className="mt-1" />
                <p className="mt-1 text-xs text-zinc-600">
                  {categoryLabel(item.market.category)} ·{" "}
                  {adminStatusLabel(item.market.status)}
                  {item.market.stats.volume_usd > 0 && (
                    <> · оборот ${Math.round(item.market.stats.volume_usd)}</>
                  )}
                </p>
              </section>
              <Link
                href={
                  isResolve
                    ? `/admin/resolve/${item.market.slug}`
                    : `/admin/markets?tab=active&q=${encodeURIComponent(item.market.slug)}`
                }
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${
                  isResolve
                    ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                    : "border border-zinc-700 text-zinc-300 hover:border-zinc-500"
                }`}
              >
                {isResolve ? "К резолву" : "Исправить"}
              </Link>
            </li>
          );
        })}
      </ul>
      {sandboxUnresolved > 0 && (
        <p className="text-xs text-zinc-600">
          {sandboxUnresolved} тестовых рынков не показаны —{" "}
          <Link href="/admin/markets?tab=sandbox" className="text-zinc-400 hover:underline">
            открыть список
          </Link>
        </p>
      )}
    </section>
  );
}
