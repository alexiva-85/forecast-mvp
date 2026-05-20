import Link from "next/link";
import { requireAccountUser } from "@/lib/account-auth";
import {
  fetchUserWithdrawalRequests,
  fetchWalletSummary,
} from "@/lib/account-data";
import { AccountBalanceCard } from "@/components/account/AccountBalanceCard";
import { TestMoneyBanner } from "@/components/account/TestMoneyBanner";
import { WithdrawalRequestForm } from "@/components/account/WithdrawalRequestForm";
import { WithdrawalRequestsList } from "@/components/account/WithdrawalRequestsList";

export default async function PortfolioWithdrawPage() {
  const { supabase } = await requireAccountUser("/portfolio/withdraw");
  const [wallet, requests] = await Promise.all([
    fetchWalletSummary(supabase),
    fetchUserWithdrawalRequests(supabase, 50),
  ]);

  const balance = wallet?.balance ?? 0;
  const held = wallet?.held ?? 0;
  const hasPending = requests.some((r) => r.status === "pending");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-white">Вывести</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Заявка резервирует сумму на счёте до решения оператора
        </p>
      </header>

      <TestMoneyBanner variant="withdraw" />

      <AccountBalanceCard balance={balance} held={held} compact />

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-medium text-white">Новая заявка</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Сумма сразу уходит в резерв и недоступна для торговли. Одна активная
          заявка «На рассмотрении»; отменить можно до обработки.
        </p>
        <div className="mt-4">
          <WithdrawalRequestForm balance={balance} hasPending={hasPending} />
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
