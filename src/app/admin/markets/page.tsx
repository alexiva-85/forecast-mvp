import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  countMarketsByTab,
  fetchAdminMarkets,
  filterAdminMarkets,
  type AdminMarketTab,
} from "@/lib/admin";
import { AdminMarketTabs } from "@/components/admin/AdminMarketTabs";
import { AdminMarketRow } from "@/components/admin/AdminMarketRow";
import { AdminMarketsSearch } from "@/components/admin/AdminMarketsSearch";

export default async function AdminMarketsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; category?: string }>;
}) {
  await requireAdmin();
  const { tab: tabRaw = "all", q = "", category = "all" } = await searchParams;
  const tab = (isValidTab(tabRaw) ? tabRaw : "all") as AdminMarketTab;

  const supabase = await createClient();
  const markets = await fetchAdminMarkets(supabase);
  const counts = countMarketsByTab(markets);
  const filtered = filterAdminMarkets(markets, tab, q, category);

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <section>
          <h2 className="text-2xl font-semibold text-white">Рынки</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Управление каталогом и статусами
          </p>
        </section>
        <Link
          href="/admin/markets/new"
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400"
        >
          Создать рынок
        </Link>
      </header>

      <AdminMarketTabs
        active={tab}
        counts={counts}
        q={q}
        category={category}
      />

      <Suspense fallback={null}>
        <AdminMarketsSearch tab={tab} category={category} q={q} />
      </Suspense>

      <ul className="space-y-4">
        {filtered.length === 0 ? (
          <li className="rounded-xl border border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
            Нет рынков в этой вкладке
          </li>
        ) : (
          filtered.map((m) => <AdminMarketRow key={m.id} market={m} />)
        )}
      </ul>
    </section>
  );
}

function isValidTab(t: string): t is AdminMarketTab {
  return [
    "all",
    "drafts",
    "active",
    "closing_soon",
    "needs_resolve",
    "resolved",
    "sandbox",
  ].includes(t);
}
