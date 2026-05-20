"use client";

import { useState, useTransition } from "react";
import { reviewWithdrawalRequest } from "@/app/actions/admin";
import {
  adminWithdrawalMethodLabel,
  adminWithdrawalStatusLabel,
  type AdminWithdrawalRequest,
} from "@/lib/admin-withdrawals";
import { formatUsdAmount } from "@/lib/wallet";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminWithdrawalRow({
  request,
}: {
  request: AdminWithdrawalRequest;
}) {
  const [note, setNote] = useState(request.admin_note ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isPending = request.status === "pending";
  const isApproved = request.status === "approved";

  function handleStatus(
    status: "approved" | "rejected" | "completed" | "cancelled",
  ) {
    setMessage(null);
    startTransition(async () => {
      const result = await reviewWithdrawalRequest({
        requestId: request.id,
        status,
        adminNote: note,
      });
      if (result.error) setMessage(result.error);
      else setMessage("Сохранено");
    });
  }

  return (
    <li className="space-y-3 px-4 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-zinc-200">
            ${formatUsdAmount(request.amount)} ·{" "}
            {adminWithdrawalMethodLabel(request.method)}
          </p>
          <p className="text-xs text-zinc-500">
            {request.user_display_name ?? "Пользователь"}
            {request.user_email ? ` · ${request.user_email}` : ""}
          </p>
          {request.details ? (
            <p className="text-xs text-zinc-400">{request.details}</p>
          ) : null}
          <p className="text-xs text-zinc-600">{formatTime(request.created_at)}</p>
        </div>
        <span
          className={`shrink-0 self-start rounded-md px-2 py-0.5 text-xs ${
            isPending || isApproved
              ? "bg-amber-500/15 text-amber-400"
              : "bg-zinc-800 text-zinc-400"
          }`}
        >
          {adminWithdrawalStatusLabel(request.status)}
        </span>
      </div>

      {isPending || isApproved ? (
        <div className="space-y-2 border-t border-zinc-800/80 pt-3">
          <label className="block">
            <span className="mb-1 block text-xs text-zinc-500">
              Заметка оператора
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={2000}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              placeholder="Внутренняя заметка (необязательно)"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {isPending ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => handleStatus("approved")}
                className="rounded-lg bg-emerald-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Одобрить
              </button>
            ) : null}
            {(isPending || isApproved) && (
              <button
                type="button"
                disabled={pending}
                onClick={() => handleStatus("completed")}
                className="rounded-lg bg-sky-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
              >
                Выплачено
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => handleStatus("rejected")}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
            >
              Отклонить
            </button>
            {isPending ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => handleStatus("cancelled")}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
              >
                Отменить
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        request.admin_note && (
          <p className="border-t border-zinc-800/80 pt-2 text-xs text-zinc-500">
            Заметка: {request.admin_note}
            {request.reviewer_display_name && request.reviewed_at ? (
              <>
                {" "}
                · {request.reviewer_display_name},{" "}
                {formatTime(request.reviewed_at)}
              </>
            ) : null}
          </p>
        )
      )}

      {message ? (
        <p
          className={`text-xs ${message === "Сохранено" ? "text-emerald-400" : "text-rose-400"}`}
        >
          {message}
        </p>
      ) : null}
    </li>
  );
}
