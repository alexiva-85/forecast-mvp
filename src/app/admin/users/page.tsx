import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { fetchAdminUsers } from "@/lib/admin-users";
import { AdminUsersSearch } from "@/components/admin/AdminUsersSearch";
import { AdminUserRow } from "@/components/admin/AdminUserRow";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q } = await searchParams;
  const supabase = await createClient();
  const users = await fetchAdminUsers(supabase, q);

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Пользователи
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Модерация, KYC-заготовка и персональные лимиты торговли
        </p>
      </header>

      <Suspense fallback={null}>
        <AdminUsersSearch initialQuery={q ?? ""} />
      </Suspense>

      {users.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-500">
          {q ? "Никого не нашли по запросу." : "Пользователей пока нет."}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/30">
          {users.map((user) => (
            <AdminUserRow key={user.id} user={user} />
          ))}
        </ul>
      )}

      <article className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 text-xs text-zinc-600">
        <p>
          KYC — только статус в БД, без внешнего провайдера. Блокировка торгов
          действует на place/cancel/redeem. Множитель лимита умножает пороги из
          раздела «Настройки» (G2).
        </p>
      </article>
    </section>
  );
}
