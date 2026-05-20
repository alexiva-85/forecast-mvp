"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { submitMarketReport } from "@/app/actions/reports";
import {
  contentReportReasonLabel,
  type ContentReportReason,
} from "@/lib/content-reports";

const REASONS: ContentReportReason[] = [
  "misleading",
  "offensive",
  "spam",
  "other",
];

export function MarketReportButton({
  marketSlug,
  marketTitle,
  isLoggedIn,
}: {
  marketSlug: string;
  marketTitle: string;
  isLoggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ContentReportReason>("misleading");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await submitMarketReport({
        marketSlug,
        reason,
        details,
      });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setMessage("Жалоба отправлена. Спасибо — оператор рассмотрит её.");
      setDetails("");
      setOpen(false);
    });
  }

  if (!isLoggedIn) {
    return (
      <p className="text-xs text-zinc-600">
        <Link
          href="/login"
          className="text-zinc-500 underline hover:text-zinc-300"
        >
          Войдите
        </Link>
        , чтобы пожаловаться на рынок
      </p>
    );
  }

  return (
    <div className="text-xs">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-zinc-600 underline decoration-zinc-700 underline-offset-2 hover:text-zinc-400"
        >
          Пожаловаться на рынок
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/80 p-3"
        >
          <p className="text-sm text-zinc-400">Жалоба: «{marketTitle}»</p>
          <label className="mt-3 block">
            <span className="mb-1 block text-zinc-500">Причина</span>
            <select
              value={reason}
              onChange={(e) =>
                setReason(e.target.value as ContentReportReason)
              }
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {contentReportReasonLabel(r)}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-2 block">
            <span className="mb-1 block text-zinc-500">
              Комментарий (необязательно)
            </span>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={2}
              maxLength={2000}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white"
              placeholder="Что именно не так?"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-zinc-700 px-3 py-1.5 text-sm text-white hover:bg-zinc-600 disabled:opacity-50"
            >
              {pending ? "Отправляем…" : "Отправить"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setMessage(null);
              }}
              className="rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-300"
            >
              Отмена
            </button>
          </div>
        </form>
      )}
      {message && (
        <p
          className={`mt-2 text-xs ${message.includes("отправлена") ? "text-emerald-400/90" : "text-rose-400/90"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
