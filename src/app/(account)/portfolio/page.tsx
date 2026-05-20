import Link from "next/link";
import { requireAccountUser } from "@/lib/account-auth";
import {
  buildOutcomeLabelsBySlug,
  collectMarketIdsFromAccountData,
  fetchAccountProfile,
  fetchUserActivity,
  fetchUserOpenOrders,
  fetchUserPositions,
  resolveActivityMarketIds,
} from "@/lib/account-data";
import { AccountBalanceCard } from "@/components/account/AccountBalanceCard";
import { PositionsList, type PositionRow } from "@/components/account/PositionsList";
import { ActivityHistory } from "@/components/ActivityHistory";

export default async function PortfolioOverviewPage() {
  const { supabase, user } = await requireAccountUser("/portfolio");
  const profile = await fetchAccountProfile(supabase, user.id);
  const positions = await fetchUserPositions(supabase, user.id);
  const openOrders = await fetchUserOpenOrders(supabase, user.id);
  const recentActivity = await fetchUserActivity(supabase, 5);

  const activitySlugs = [
    ...new Set(
      recentActivity
        .map((row) => row.market_slug)
        .filter((slug): slug is string => Boolean(slug)),
    ),
  ];

  let marketIds = collectMarketIdsFromAccountData({
    positions,
    orders: openOrders,
  });
  marketIds = await resolveActivityMarketIds(
    supabase,
    activitySlugs,
    marketIds,
  );

  const { byMarketId, bySlug } = await buildOutcomeLabelsBySlug(
    supabase,
    marketIds,
  );

  const previewPositions = positions.slice(0, 3) as PositionRow[];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-white">Обзор</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Баланс и краткая сводка по счёту
        </p>
      </header>

      <AccountBalanceCard
        balance={Number(profile.balance)}
        showActions
      />

      <p className="text-xs leading-relaxed text-zinc-600">
        Средства на счёте — тестовые. Реальное пополнение и выплаты после
        юридической модели (E2) и платёжного провайдера.
      </p>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/portfolio/positions"
          className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 transition-colors hover:border-zinc-700"
        >
          <p className="text-xs text-zinc-500">Позиции</p>
          <p className="mt-1 text-xl font-semibold text-white">
            {positions.length}
          </p>
        </Link>
        <Link
          href="/portfolio/orders"
          className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 transition-colors hover:border-zinc-700"
        >
          <p className="text-xs text-zinc-500">Открытые заявки</p>
          <p className="mt-1 text-xl font-semibold text-white">
            {openOrders.length}
          </p>
        </Link>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-zinc-400">Позиции</h2>
          {positions.length > 3 && (
            <Link
              href="/portfolio/positions"
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              Все →
            </Link>
          )}
        </div>
        <PositionsList
          positions={previewPositions}
          outcomeLabelsByMarketId={byMarketId}
        />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-zinc-400">
            Последние операции
          </h2>
          <Link
            href="/portfolio/activity"
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            Вся история →
          </Link>
        </div>
        <ActivityHistory
          activities={recentActivity}
          outcomeLabelsBySlug={bySlug}
        />
      </section>
    </div>
  );
}
