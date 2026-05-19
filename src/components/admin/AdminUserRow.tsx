"use client";

import { useState, useTransition } from "react";
import { updateUserModeration } from "@/app/actions/admin";
import {
  type AdminUserRow as AdminUser,
  type KycStatus,
  kycStatusChipClass,
  kycStatusLabel,
} from "@/lib/admin-users";

const KYC_OPTIONS: KycStatus[] = [
  "none",
  "pending",
  "verified",
  "rejected",
];

export function AdminUserRow({ user }: { user: AdminUser }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [tradingBlocked, setTradingBlocked] = useState(user.trading_blocked);
  const [kycStatus, setKycStatus] = useState<KycStatus>(user.kyc_status);
  const [note, setNote] = useState(user.moderation_note ?? "");
  const [multiplier, setMultiplier] = useState(
    String(user.rate_limit_multiplier),
  );

  function handleSave() {
    setMessage(null);
    const mult = Number(multiplier);
    if (!Number.isFinite(mult) || mult <= 0 || mult > 10) {
      setMessage("Множитель: от 0.01 до 10");
      return;
    }
    startTransition(async () => {
      const result = await updateUserModeration({
        userId: user.id,
        tradingBlocked,
        kycStatus,
        moderationNote: note,
        rateLimitMultiplier: mult,
      });
      if (result.error) setMessage(result.error);
      else {
        setMessage("Сохранено");
        setOpen(false);
      }
    });
  }

  return (
    <li className="px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-medium text-zinc-100">
            {user.display_name ?? "Без имени"}
            {user.is_admin && (
              <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-300">
                Админ
              </span>
            )}
          </p>
          <p className="truncate text-xs text-zinc-500">{user.email}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`rounded-md px-2 py-0.5 ${kycStatusChipClass(user.kyc_status)}`}
            >
              {kycStatusLabel(user.kyc_status)}
            </span>
            {user.trading_blocked && (
              <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-rose-400">
                Торги заблокированы
              </span>
            )}
            {user.rate_limit_multiplier !== 1 && (
              <span className="text-zinc-500">
                Лимит ×{user.rate_limit_multiplier}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-right text-xs text-zinc-500">
          <div>
            <p className="tabular-nums text-zinc-300">
              ${user.balance.toLocaleString("ru-RU", { maximumFractionDigits: 0 })}
            </p>
            <p className="mt-0.5 text-zinc-600">
              {new Date(user.created_at).toLocaleDateString("ru-RU")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-zinc-700 px-2.5 py-1 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          >
            {open ? "Свернуть" : "Изменить"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={tradingBlocked}
              onChange={(e) => setTradingBlocked(e.target.checked)}
              className="rounded border-zinc-600"
            />
            Заблокировать торги
          </label>

          <label className="block text-sm">
            <span className="text-zinc-500">KYC (заготовка)</span>
            <select
              value={kycStatus}
              onChange={(e) => setKycStatus(e.target.value as KycStatus)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
            >
              {KYC_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {kycStatusLabel(s)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-zinc-500">
              Множитель лимита G2 (1 = норма, 0.5 = строже)
            </span>
            <input
              type="number"
              min={0.1}
              max={10}
              step={0.1}
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
            />
          </label>

          <label className="block text-sm">
            <span className="text-zinc-500">Заметка оператора</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
              placeholder="Причина блокировки, ссылка на тикет…"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={handleSave}
              className="rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/30 disabled:opacity-50"
            >
              {pending ? "Сохраняем…" : "Сохранить"}
            </button>
            {message && (
              <p
                className={`text-xs ${message === "Сохранено" ? "text-emerald-400" : "text-rose-400"}`}
              >
                {message}
              </p>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
