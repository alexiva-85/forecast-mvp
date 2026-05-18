import Link from "next/link";
import type { AdminMarket } from "@/lib/admin";
import {
  adminStatusChipClass,
  adminStatusLabel,
  formatAdminVolume,
  sandboxBadgeClass,
} from "@/lib/admin";
import { categoryLabel, formatClosesAt } from "@/lib/markets";
import { AdminMarketSlug } from "@/components/admin/AdminMarketSlug";
import { AdminMarketPublishButton } from "@/components/admin/AdminMarketPublishButton";

export function AdminMarketRow({ market }: { market: AdminMarket }) {
  const resolveHref = `/admin/resolve/${market.slug}`;
  const showResolve = market.status === "closed";

  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <section className="min-w-0 flex-1">
          <section className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-medium ${adminStatusChipClass(market.status)}`}
            >
              {adminStatusLabel(market.status)}
            </span>
            <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
              {categoryLabel(market.category)}
            </span>
            {market.is_sandbox && (
              <span
                className={`rounded-md px-2 py-0.5 text-xs ${sandboxBadgeClass()}`}
              >
                Тестовый · скрыт
              </span>
            )}
            {market.status === "open" &&
              !market.is_sandbox &&
              (!market.resolution_rules?.trim() ||
                !market.resolution_checklist?.length) && (
                <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-xs text-rose-400">
                  Нет правил
                </span>
              )}
          </section>
          <h3 className="font-medium text-white">{market.title}</h3>
          <AdminMarketSlug slug={market.slug} className="mt-1" />
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
            {formatClosesAt(market.closes_at) && (
              <span>Закрытие: {formatClosesAt(market.closes_at)}</span>
            )}
            <span>Оборот: {formatAdminVolume(market.stats.volume_usd)}</span>
            <span>Сделок: {market.stats.trade_count}</span>
            <span>Ордеров: {market.stats.open_orders}</span>
            {market.resolved_side && (
              <span className="text-amber-400/90">
                Исход: {market.resolved_side === "yes" ? "Да" : "Нет"}
              </span>
            )}
          </p>
          {market.resolution_rules && (
            <p className="mt-2 line-clamp-2 text-sm text-zinc-500">
              {market.resolution_rules}
            </p>
          )}
        </section>
        <section className="flex shrink-0 flex-col items-end gap-2">
          {market.is_sandbox && (
            <AdminMarketPublishButton slug={market.slug} />
          )}
          <Link
            href={`/market/${market.slug}`}
            className="text-xs text-emerald-400 hover:underline"
          >
            На сайте ↗
          </Link>
          {showResolve && (
            <Link
              href={resolveHref}
              className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/30"
            >
              К резолву
            </Link>
          )}
        </section>
      </section>
    </li>
  );
}
