"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export type AdminTradingView = "trades" | "orders";

export function AdminTradingTabs({ active }: { active: AdminTradingView }) {
  const searchParams = useSearchParams();
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";

  const tabs: { id: AdminTradingView; label: string }[] = [
    { id: "trades", label: "Сделки" },
    { id: "orders", label: "Заявки" },
  ];

  return (
    <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-950/60 p-1">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        const href =
          tab.id === "trades"
            ? `/admin/trading${suffix}`
            : `/admin/trading/orders${suffix}`;
        return (
          <Link
            key={tab.id}
            href={href}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-amber-500/15 text-amber-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
