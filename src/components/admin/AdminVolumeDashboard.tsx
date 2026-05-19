import Link from "next/link";
import type { AdminTopMarketRow, AdminVolumePeriod } from "@/lib/admin";
import { formatAdminVolume, volumePeriodLabel } from "@/lib/admin";
import { categoryLabel } from "@/lib/markets";
import { AdminMarketSlug } from "@/components/admin/AdminMarketSlug";

export function AdminVolumeDashboard({
  volume,
  topByPeriod,
}: {
  volume: {
    volume_24h: number;
    volume_7d: number;
    volume_30d: number;
    trades_24h: number;
    trades_7d: number;
    trades_30d: number;
  };
  topByPeriod: Record<AdminVolumePeriod, AdminTopMarketRow[]>;
}) {
  const periods: AdminVolumePeriod[] = ["24h", "7d", "30d"];

  const volumeByPeriod: Record<AdminVolumePeriod, number> = {
    "24h": volume.volume_24h,
    "7d": volume.volume_7d,
    "30d": volume.volume_30d,
  };

  const tradesByPeriod: Record<AdminVolumePeriod, number> = {
    "24h": volume.trades_24h,
    "7d": volume.trades_7d,
    "30d": volume.trades_30d,
  };

  return (
    <section className="space-y-4">
      <header>
        <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Оборот
        </h3>
        <p className="mt-1 text-xs text-zinc-600">Без тестовых рынков</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {periods.map((period) => (
          <article
            key={period}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
          >
            <p className="text-xs text-zinc-500">{volumePeriodLabel(period)}</p>
            <p className="mt-1 text-xl font-semibold text-white">
              {formatAdminVolume(volumeByPeriod[period])}
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-600">
              {tradesByPeriod[period] === 0
                ? "нет сделок"
                : `${tradesByPeriod[period]} сделок`}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {periods.map((period) => {
          const rows = topByPeriod[period];
          return (
            <article
              key={period}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
            >
              <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Топ за {volumePeriodLabel(period).toLowerCase()}
              </h4>
              {rows.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-600">Нет сделок за период</p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {rows.map((row, i) => (
                    <li key={row.market_id}>
                      <Link
                        href={`/admin/markets?tab=all&q=${encodeURIComponent(row.slug)}`}
                        className="block rounded-md px-1 py-1 transition-colors hover:bg-zinc-800/80"
                      >
                        <p className="text-sm text-zinc-200">
                          <span className="mr-1.5 text-zinc-600">{i + 1}.</span>
                          <span className="line-clamp-2">{row.title}</span>
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
                          <span>{formatAdminVolume(row.volume_usd)}</span>
                          <span>· {row.trade_count} сд.</span>
                          <span>· {categoryLabel(row.category)}</span>
                        </p>
                        <AdminMarketSlug slug={row.slug} className="mt-0.5" />
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </article>
          );
        })}
      </section>
    </section>
  );
}
