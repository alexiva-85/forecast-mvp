"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { AdminOrderStatus } from "@/lib/admin-trading";

const STATUS_OPTIONS: { value: "" | AdminOrderStatus; label: string }[] = [
  { value: "", label: "Все статусы" },
  { value: "open", label: "Открытые" },
  { value: "filled", label: "Исполненные" },
  { value: "cancelled", label: "Отменённые" },
];

export function AdminTradingSearch({
  initialQuery,
  initialStatus,
  showStatusFilter,
  basePath = "/admin/trading",
}: {
  initialQuery: string;
  initialStatus: AdminOrderStatus | "";
  showStatusFilter: boolean;
  basePath?: "/admin/trading" | "/admin/trading/orders";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = query.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    if (showStatusFilter) {
      if (status) params.set("status", status);
      else params.delete("status");
    }
    startTransition(() => {
      router.push(`${basePath}?${params.toString()}`);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Email, slug рынка, UUID"
        className="min-w-[14rem] flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
      />
      {showStatusFilter && (
        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as AdminOrderStatus | "")
          }
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/30 disabled:opacity-50"
      >
        {pending ? "Ищем…" : "Найти"}
      </button>
    </form>
  );
}
