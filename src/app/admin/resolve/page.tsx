import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { fetchAdminMarkets } from "@/lib/admin";
import { categoryLabel, formatClosesAt } from "@/lib/markets";

export default async function AdminResolveQueuePage() {
  await requireAdmin();
  const supabase = await createClient();
  const markets = await fetchAdminMarkets(supabase);
  const queue = markets.filter(
    (m) => !m.is_sandbox && m.status === "closed",
  );

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-white">Резолв</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Рынки с закрытыми торгами — фиксация исхода Да/Нет
        </p>
      </header>

      {queue.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-8 text-center text-sm text-zinc-500">
          Нет рынков, ожидающих резолва
        </p>
      ) : (
        <ul className="space-y-3">
          {queue.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-500/20 bg-zinc-900/50 p-4"
            >
              <section>
                <p className="font-medium text-white">{m.title}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {categoryLabel(m.category)}
                  {formatClosesAt(m.closes_at) &&
                    ` · Закрытие: ${formatClosesAt(m.closes_at)}`}
                </p>
              </section>
              <Link
                href={`/admin/resolve/${m.slug}`}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400"
              >
                Проверить и зафиксировать
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
