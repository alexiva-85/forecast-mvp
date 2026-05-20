"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitWithdrawalRequest } from "@/app/actions/wallet";
import { formatUsdAmount, type WithdrawalMethod } from "@/lib/wallet";

export function WithdrawalRequestForm({
  balance,
  hasPending,
}: {
  balance: number;
  hasPending: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    const form = new FormData(e.currentTarget);
    const amount = String(form.get("amount") ?? "");
    const method = String(form.get("method") ?? "") as WithdrawalMethod;
    const details = String(form.get("details") ?? "");

    startTransition(async () => {
      const result = await submitWithdrawalRequest({ amount, method, details });
      if (result.error) {
        setMessage(result.error);
      } else {
        setMessage("Заявка принята — статус «На рассмотрении»");
        e.currentTarget.reset();
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-zinc-500">
        Доступно к заявке:{" "}
        <span className="font-medium text-emerald-400">
          ${formatUsdAmount(balance)}
        </span>
      </p>

      <label className="block text-sm text-zinc-400">
        Сумма, USD
        <input
          name="amount"
          type="text"
          inputMode="decimal"
          required
          disabled={hasPending || pending}
          placeholder="100.00"
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-emerald-500/50 disabled:opacity-50"
        />
      </label>

      <label className="block text-sm text-zinc-400">
        Способ (заготовка)
        <select
          name="method"
          required
          disabled={hasPending || pending}
          defaultValue="bank"
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-emerald-500/50 disabled:opacity-50"
        >
          <option value="bank">Банковский перевод</option>
          <option value="card">Карта</option>
          <option value="crypto">Криптовалюта</option>
        </select>
      </label>

      <label className="block text-sm text-zinc-400">
        Реквизиты или комментарий
        <textarea
          name="details"
          rows={3}
          maxLength={500}
          disabled={hasPending || pending}
          placeholder="Например: последние цифры счёта или сеть USDT — для демо, без реальной выплаты"
          className="mt-1 w-full resize-y rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50 disabled:opacity-50"
        />
      </label>

      {hasPending ? (
        <p className="text-sm text-zinc-500">
          Сначала дождитесь обработки текущей заявки или отмены в поддержке.
        </p>
      ) : (
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {pending ? "Отправка…" : "Отправить заявку"}
        </button>
      )}

      {message && (
        <p
          className={`text-sm ${
            message.includes("принята") ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
