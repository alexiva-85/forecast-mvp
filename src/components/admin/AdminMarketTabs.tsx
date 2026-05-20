import Link from "next/link";
import type { AdminMarketTab } from "@/lib/admin";

const tabs: { id: AdminMarketTab; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "drafts", label: "Черновики" },
  { id: "active", label: "Активные" },
  { id: "closing_soon", label: "Скоро закрываются" },
  { id: "needs_resolve", label: "Требуют резолва" },
  { id: "resolved", label: "Завершённые" },
  { id: "archive", label: "Архив" },
  { id: "sandbox", label: "Тестовые" },
];

export function AdminMarketTabs({
  active,
  counts,
  q,
  category,
}: {
  active: AdminMarketTab;
  counts: Record<AdminMarketTab, number>;
  q?: string;
  category?: string;
}) {
  function href(tab: AdminMarketTab) {
    const params = new URLSearchParams();
    if (tab !== "all") params.set("tab", tab);
    if (q) params.set("q", q);
    if (category && category !== "all") params.set("category", category);
    const qs = params.toString();
    return `/admin/markets${qs ? `?${qs}` : ""}`;
  }

  return (
    <nav className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={href(tab.id)}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            active === tab.id
              ? "bg-zinc-700 text-white"
              : "bg-zinc-900 text-zinc-400 hover:text-white"
          }`}
        >
          {tab.label}
          <span className="ml-1.5 text-xs opacity-70">({counts[tab.id] ?? 0})</span>
        </Link>
      ))}
    </nav>
  );
}
