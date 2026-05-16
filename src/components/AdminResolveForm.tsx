"use client";

import { useTransition } from "react";
import { adminResolveMarket } from "@/app/actions/trading";

export function AdminResolveForm({
  marketId,
  slug,
}: {
  marketId: string;
  slug: string;
}) {
  const [pending, startTransition] = useTransition();

  function resolve(side: "yes" | "no") {
    startTransition(async () => {
      await adminResolveMarket(marketId, side, slug);
    });
  }

  return (
    <div className="mt-4 flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => resolve("yes")}
        className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
      >
        Исход: Да
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => resolve("no")}
        className="rounded-lg bg-rose-500/20 px-4 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/30 disabled:opacity-50"
      >
        Исход: Нет
      </button>
    </div>
  );
}
