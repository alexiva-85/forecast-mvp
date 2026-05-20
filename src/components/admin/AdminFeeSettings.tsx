"use client";

import { useState, useTransition } from "react";
import { setTradeFeeRate } from "@/app/actions/admin";
import { formatFeePercent, type PlatformFeeReconcile } from "@/lib/platform";

export function AdminFeeSettings({
  tradeFeeRate,
  feeBalance,
  reconcile,
}: {
  tradeFeeRate: number;
  feeBalance: number;
  reconcile: PlatformFeeReconcile | null;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [percent, setPercent] = useState(String(tradeFeeRate * 100));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const value = parseFloat(percent.replace(",", "."));
    startTransition(async () => {
      const result = await setTradeFeeRate(value);
      if (result.error) setMessage(result.error);
      else setMessage("Ставка обновлена");
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
    >
      <h2 className="text-lg font-medium text-white">Комиссия платформы</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Текущая ставка: {formatFeePercent(tradeFeeRate)} · Накоплено: $
        {feeBalance.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}
      </p>
      {reconcile && (
        <div className="mt-2 space-y-1 text-xs">
          <p
            className={
              reconcile.ledgerReconcileOk
                ? "text-emerald-400/90"
                : "text-amber-400/90"
            }
          >
            Ledger ↔ сделки: $
            {reconcile.tradesFeeTotal.toFixed(2)} / $
            {reconcile.ledgerFeeTotal.toFixed(2)} ·{" "}
            {reconcile.ledgerReconcileOk ? "OK" : "расхождение"}
          </p>
          <p
            className={
              reconcile.balanceReconcileOk
                ? "text-zinc-500"
                : "text-amber-400/90"
            }
          >
            Накоплено ↔ Σ сделок: $
            {reconcile.feeBalance.toFixed(2)} / $
            {reconcile.tradesFeeTotal.toFixed(2)}
            {!reconcile.balanceReconcileOk && " · проверьте fee_balance"}
          </p>
        </div>
      )}
      <label className="mt-4 block">
        <span className="mb-1 block text-xs text-zinc-500">
          Новая ставка, % (0–5)
        </span>
        <input
          type="number"
          step="0.1"
          min={0}
          max={5}
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
      >
        {pending ? "Сохраняем…" : "Изменить ставку"}
      </button>
      {message && (
        <p
          className={`mt-3 text-sm ${message.includes("обновлена") ? "text-emerald-400" : "text-rose-400"}`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
