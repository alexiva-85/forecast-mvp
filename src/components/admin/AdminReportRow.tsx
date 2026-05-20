"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateContentReport } from "@/app/actions/admin";
import {
  contentReportReasonLabel,
  contentReportStatusLabel,
  type AdminContentReport,
} from "@/lib/content-reports";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminReportRow({ report }: { report: AdminContentReport }) {
  const [note, setNote] = useState(report.admin_note ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isPending = report.status === "pending";

  function handleStatus(
    status: "reviewed" | "dismissed" | "action_taken",
  ) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateContentReport({
        reportId: report.id,
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
            {report.subject_type === "market" ? (
              <Link
                href={`/market/${report.subject_slug}`}
                className="hover:text-amber-400"
              >
                {report.subject_title}
              </Link>
            ) : (
              report.subject_title
            )}
          </p>
          <p className="text-xs text-zinc-500">
            {contentReportReasonLabel(report.reason)}
            {report.details && (
              <>
                {" · "}
                <span className="text-zinc-400">{report.details}</span>
              </>
            )}
          </p>
          <p className="text-xs text-zinc-600">
            От: {report.reporter_display_name ?? "Пользователь"} ·{" "}
            {formatTime(report.created_at)}
          </p>
        </div>
        <span
          className={`shrink-0 self-start rounded-md px-2 py-0.5 text-xs ${
            isPending
              ? "bg-amber-500/15 text-amber-400"
              : "bg-zinc-800 text-zinc-400"
          }`}
        >
          {contentReportStatusLabel(report.status)}
        </span>
      </div>

      {isPending ? (
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
            <button
              type="button"
              disabled={pending}
              onClick={() => handleStatus("action_taken")}
              className="rounded-lg bg-emerald-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Принять меры
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => handleStatus("reviewed")}
              className="rounded-lg bg-zinc-700 px-3 py-1.5 text-xs text-white hover:bg-zinc-600 disabled:opacity-50"
            >
              Просмотрена
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => handleStatus("dismissed")}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
            >
              Отклонить
            </button>
          </div>
        </div>
      ) : (
        report.admin_note && (
          <p className="border-t border-zinc-800/80 pt-2 text-xs text-zinc-500">
            Заметка: {report.admin_note}
            {report.reviewer_display_name && (
              <>
                {" "}
                · {report.reviewer_display_name},{" "}
                {report.reviewed_at && formatTime(report.reviewed_at)}
              </>
            )}
          </p>
        )
      )}

      {message && (
        <p
          className={`text-xs ${message === "Сохранено" ? "text-emerald-400" : "text-rose-400"}`}
        >
          {message}
        </p>
      )}
    </li>
  );
}
