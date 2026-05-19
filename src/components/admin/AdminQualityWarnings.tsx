import Link from "next/link";
import type { AdminQualityMarketWarning } from "@/lib/admin-quality";
import { qualityWarningMeta } from "@/lib/admin-quality";

export function AdminQualityWarnings({
  items,
  maxItems = 5,
}: {
  items: AdminQualityMarketWarning[];
  maxItems?: number;
}) {
  const visible = items.slice(0, maxItems);
  const rest = items.length - visible.length;

  if (items.length === 0) {
    return (
      <article className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
        <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Качество рынков
        </h3>
        <p className="mt-3 text-zinc-500">Замечаний по активным рынкам нет</p>
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-amber-400/80">
          Качество рынков
        </h3>
        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-amber-300">
          {items.length}
        </span>
      </div>
      <ul className="mt-3 space-y-3">
        {visible.map(({ market, warnings }) => (
          <li key={market.id} className="space-y-1">
            <Link
              href={`/market/${market.slug}`}
              className="font-medium text-zinc-200 hover:text-white hover:underline"
            >
              {market.title}
            </Link>
            <ul className="space-y-0.5 pl-0.5">
              {warnings.map((w) => {
                const meta = qualityWarningMeta(w.code);
                return (
                  <li
                    key={`${market.id}-${w.code}`}
                    className={`text-xs ${meta.className}`}
                  >
                    <span className="text-zinc-600">{meta.label}: </span>
                    {w.message}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
      {rest > 0 && (
        <Link
          href="/admin/markets?tab=active"
          className="mt-3 inline-block text-xs font-medium text-amber-400/90 hover:underline"
        >
          Ещё {rest} рынков с замечаниями →
        </Link>
      )}
    </article>
  );
}
