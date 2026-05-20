import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  type AdminOrderStatus,
  fetchAdminOrders,
} from "@/lib/admin-trading";
import { AdminTradingSearch } from "@/components/admin/AdminTradingSearch";
import { AdminTradingTabs } from "@/components/admin/AdminTradingTabs";
import { AdminOrderRow } from "@/components/admin/AdminOrderRow";

function parseOrderStatus(raw?: string): AdminOrderStatus | "" {
  if (raw === "open" || raw === "filled" || raw === "cancelled") return raw;
  return "";
}

export default async function AdminTradingOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdmin();
  const { q, status: statusRaw } = await searchParams;
  const status = parseOrderStatus(statusRaw);
  const supabase = await createClient();
  const orders = await fetchAdminOrders(supabase, {
    search: q,
    status: status || null,
  });

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
        <AdminTradingTabs active="orders" />
      </Suspense>

      <Suspense fallback={null}>
        <AdminTradingSearch
          initialQuery={q ?? ""}
          initialStatus={status}
          showStatusFilter
          basePath="/admin/trading/orders"
        />
      </Suspense>

      {orders.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-500">
          {q || status
            ? "Ничего не нашли по фильтрам."
            : "Заявок пока нет."}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/30">
          {orders.map((order) => (
            <AdminOrderRow key={order.id} order={order} />
          ))}
        </ul>
      )}

      <article className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 text-xs text-zinc-600">
        <p>
          Показаны последние 50 заявок. Фильтр по статусу: открытые, исполненные,
          отменённые. Поиск: email, slug рынка, UUID заявки или пользователя.
        </p>
      </article>
    </section>
  );
}
