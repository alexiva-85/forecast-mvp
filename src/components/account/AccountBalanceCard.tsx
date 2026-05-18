export function AccountBalanceCard({
  balance,
  compact = false,
}: {
  balance: number;
  compact?: boolean;
}) {
  const formatted = Number(balance).toLocaleString("ru-RU", {
    maximumFractionDigits: 2,
  });

  if (compact) {
    return (
      <p className="text-2xl font-semibold tabular-nums text-emerald-400">
        ${formatted}
      </p>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <p className="text-sm text-zinc-500">Доступный тестовый баланс</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-emerald-400">
        ${formatted}
      </p>
    </section>
  );
}
