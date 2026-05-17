"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { AdminMarketTab } from "@/lib/admin";

export function AdminMarketsSearch({
  tab,
  category,
  q,
}: {
  tab: AdminMarketTab;
  category: string;
  q: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(field: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(field, value);
    else params.delete(field);
    if (tab !== "all") params.set("tab", tab);
    router.push(`/admin/markets?${params.toString()}`);
  }

  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        update("q", (fd.get("q") as string).trim());
      }}
    >
      <input
        name="q"
        defaultValue={q}
        placeholder="Поиск по названию…"
        className="min-w-[200px] flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
      />
      <select
        name="category"
        defaultValue={category}
        onChange={(e) => update("category", e.target.value)}
        className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
      >
        <option value="all">Все категории</option>
        <option value="crypto">Крипто</option>
        <option value="sport">Спорт</option>
      </select>
      <button
        type="submit"
        className="rounded-lg bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600"
      >
        Найти
      </button>
    </form>
  );
}
