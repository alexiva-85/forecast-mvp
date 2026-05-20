"use client";

import { useState, useTransition } from "react";
import { UiListRow } from "@/components/UiListRow";
import { cancelWithdrawalRequest } from "@/app/actions/wallet";
import {
  formatUsdAmount,
  withdrawalMethodLabel,
  withdrawalStatusLabel,
  type WithdrawalRequestRow as WithdrawalRequest,
} from "@/lib/wallet";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WithdrawalRequestRow({ row }: { row: WithdrawalRequest }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canCancel = row.status === "pending";

  function handleCancel() {
    setMessage(null);
    startTransition(async () => {
      const result = await cancelWithdrawalRequest(row.id);
      if (result.error) setMessage(result.error);
      else setMessage("Заявка отменена");
    });
  }

  return (
    <li className="space-y-2 px-4 py-3">
      <UiListRow
        actionLine={`Вывод · ${withdrawalMethodLabel(row.method)}`}
        termsLine={
          row.details ? row.details : withdrawalStatusLabel(row.status)
        }
        meta={formatDate(row.created_at)}
        right={
          <div className="text-right">
            <p className="text-sm font-medium tabular-nums text-zinc-300">
              −${formatUsdAmount(row.amount)}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {withdrawalStatusLabel(row.status)}
            </p>
          </div>
        }
      />
      {canCancel ? (
        <button
          type="button"
          disabled={pending}
          onClick={handleCancel}
          className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline disabled:opacity-50"
        >
          Отменить заявку
        </button>
      ) : null}
      {message ? (
        <p
          className={`text-xs ${message === "Заявка отменена" ? "text-emerald-400" : "text-rose-400"}`}
        >
          {message}
        </p>
      ) : null}
    </li>
  );
}
