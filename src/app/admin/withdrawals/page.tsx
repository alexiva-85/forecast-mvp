import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminWithdrawalRow } from "@/components/admin/AdminWithdrawalRow";
import {
  parseAdminWithdrawalRows,
  parseWalletReconcileRows,
} from "@/lib/admin-withdrawals";

const TABS = [
  { id: "pending", label: "Ожидают" },
  { id: "approved", label: "Одобены" },
  { id: "all", label: "Все" },
  { id: "completed", label: "Выплачены" },
  { id: "rejected", label: "Отклонены" },
] as const;

type WithdrawalTab = (typeof TABS)[number]["id"];

export default async function AdminWithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin();
  const { tab: tabRaw = "pending" } = await searchParams;
  const tab: WithdrawalTab = TABS.some((t) => t.id === tabRaw)
    ? (tabRaw as WithdrawalTab)
    : "pending";

  const supabase = await createClient();
  const [{ data: listData, error: listError }, { data: reconcileData }] =
    await Promise.all([
      supabase.rpc("admin_withdrawal_requests_list", {
        p_status: tab,
        p_limit: 80,
        p_offset: 0,
      }),
      supabase.rpc("admin_wallet_reconcile", { p_user_id: null }),
    ]);

  if (listError) throw listError;

  const requests = parseAdminWithdrawalRows(listData);
  const reconcile = parseWalletReconcileRows(reconcileData);
  const mismatches = reconcile.filter((r) => !r.matches).length;

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Выводы
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Очередь заявок и сверка ledger с балансом (E4)
        </p>
      </header>

      {mismatches > 0 ? (
        <aside className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          <p className="font-medium text-amber-200">
            Расхождение ledger: {mismatches} счёт(ов)
          </p>
          <p className="mt-1 text-xs text-amber-100/75">
            Сумма записей ledger может не совпадать с балансом, если после
            снимка E4 были сделки в стакане (торговля пока не пишется в
            ledger). Заявки на вывод и резерв сверяются отдельно.
          </p>
        </aside>
      ) : (
        <p className="text-xs text-emerald-500/90">
          Сверка ledger: все счета совпадают (в пределах снимка E4).
        </p>
      )}

      <nav className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const params = new URLSearchParams();
          if (t.id !== "pending") params.set("tab", t.id);
          const qs = params.toString();
          return (
            <Link
              key={t.id}
              href={`/admin/withdrawals${qs ? `?${qs}` : ""}`}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                tab === t.id
                  ? "bg-zinc-700 text-white"
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {requests.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-500">
          {tab === "pending"
            ? "Новых заявок на вывод нет."
            : "В этой вкладке записей нет."}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/30">
          {requests.map((request) => (
            <AdminWithdrawalRow key={request.id} request={request} />
          ))}
        </ul>
      )}
    </section>
  );
}
