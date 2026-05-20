import Link from "next/link";

export function AccountBalanceCard({
  balance,
  compact = false,
  showActions = false,
}: {
  balance: number;
  compact?: boolean;
  showActions?: boolean;
}) {
  const formatted = Number(balance).toLocaleString("ru-RU", {
    maximumFractionDigits: 2,
  });

  const actions = showActions ? (
    <div className="mt-4 flex flex-wrap gap-2">
      <Link
        href="/portfolio/deposit"
        className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:text-white"
      >
        Пополнить
      </Link>
      <Link
        href="/portfolio/withdraw"
        className="rounded-lg bg-emerald-600/90 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
      >
        Вывести
      </Link>
    </div>
  ) : null;

  if (compact) {
    return (
      <div>
        <p className="text-2xl font-semibold tabular-nums text-emerald-400">
          ${formatted}
        </p>
        {actions}
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <p className="text-sm text-zinc-500">Доступный тестовый баланс</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-emerald-400">
        ${formatted}
      </p>
      {actions}
    </section>
  );
}
