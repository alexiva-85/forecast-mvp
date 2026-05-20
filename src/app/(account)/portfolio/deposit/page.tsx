import Link from "next/link";
import { requireAccountUser } from "@/lib/account-auth";
import { fetchAccountProfile } from "@/lib/account-data";
import { AccountBalanceCard } from "@/components/account/AccountBalanceCard";
import { TestMoneyBanner } from "@/components/account/TestMoneyBanner";

export default async function PortfolioDepositPage() {
  const { supabase, user } = await requireAccountUser("/portfolio/deposit");
  const profile = await fetchAccountProfile(supabase, user.id);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-white">Пополнить</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Тестовый счёт — реальные платежи позже
        </p>
      </header>

      <TestMoneyBanner variant="deposit" />

      <AccountBalanceCard balance={Number(profile.balance)} />

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-medium text-white">Как сейчас</h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-400">
          <li>
            При первом входе на баланс зачисляется{" "}
            <span className="text-zinc-200">$10&nbsp;000</span> виртуальных
            средств для торговли в стакане.
          </li>
          <li>
            Пополнение картой, СБП или криптовалютой появится после блока{" "}
            <span className="text-zinc-300">E2</span> (юридическая модель) и
            подключения PSP — без этого интеграции в MVP нет.
          </li>
          <li>
            История пополнений и сверка с платёжным провайдером — в блоке{" "}
            <span className="text-zinc-300">E4</span> (ledger с аудитом).
          </li>
        </ul>
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
