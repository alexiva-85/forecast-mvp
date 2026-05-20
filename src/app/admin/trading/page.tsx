import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { fetchAdminTrades } from "@/lib/admin-trading";
import { AdminTradingSearch } from "@/components/admin/AdminTradingSearch";
import { AdminTradingTabs } from "@/components/admin/AdminTradingTabs";
import { AdminTradeRow } from "@/components/admin/AdminTradeRow";

export default async function AdminTradingTradesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q } = await searchParams;
  const supabase = await createClient();
  const trades = await fetchAdminTrades(supabase, { search: q });

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Сделки и заявки
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Поиск по пользователю и рынку для поддержки и расследований
        </p>
      </header>

      <Suspense fallback={null}>
        <AdminTradingTabs active="trades" />
      </Suspense>

      <Suspense fallback={null}>
        <AdminTradingSearch
          initialQuery={q ?? ""}
          initialStatus=""
          showStatusFilter={false}
        />
      </Suspense>

      {trades.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-500">
          {q ? "Ничего не нашли по запросу." : "Сделок пока нет."}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/30">
          {trades.map((trade) => (
            <AdminTradeRow key={trade.id} trade={trade} />
          ))}
        </ul>
      )}

      <article className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 text-xs text-zinc-600">
        <p>
          Показаны последние 50 сделок. Поиск: email покупателя или продавца,
          slug или название рынка, UUID сделки или пользователя.
        </p>
      </article>
    </section>
  );
}
