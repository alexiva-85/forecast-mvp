import Link from "next/link";
import { requireAccountUser } from "@/lib/account-auth";
import {
  fetchAccountProfile,
  fetchUserWithdrawalRequests,
} from "@/lib/account-data";
import { AccountBalanceCard } from "@/components/account/AccountBalanceCard";
import { TestMoneyBanner } from "@/components/account/TestMoneyBanner";
import { WithdrawalRequestForm } from "@/components/account/WithdrawalRequestForm";
import { WithdrawalRequestsList } from "@/components/account/WithdrawalRequestsList";

export default async function PortfolioWithdrawPage() {
  const { supabase, user } = await requireAccountUser("/portfolio/withdraw");
  const [profile, requests] = await Promise.all([
    fetchAccountProfile(supabase, user.id),
    fetchUserWithdrawalRequests(supabase, 50),
  ]);

  const hasPending = requests.some((r) => r.status === "pending");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-white">Вывести</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Заявка на вывод без списания баланса (заготовка E3)
        </p>
      </header>

      <TestMoneyBanner variant="withdraw" />

      <AccountBalanceCard balance={Number(profile.balance)} compact />

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-medium text-white">Новая заявка</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Сумма не списывается с баланса до подключения выплат. Одна активная
          заявка со статусом «На рассмотрении».
        </p>
        <div className="mt-4">
          <WithdrawalRequestForm
            balance={Number(profile.balance)}
            hasPending={hasPending}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium text-zinc-400">
          Ваши заявки
        </h2>
        <WithdrawalRequestsList requests={requests} />
      </section>

      <p className="text-sm text-zinc-500">
        <Link
          href="/portfolio"
          className="text-emerald-400 hover:text-emerald-300"
        >
          ← Обзор кабинета
        </Link>
      </p>
    </div>
  );
}
