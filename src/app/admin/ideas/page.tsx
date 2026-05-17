"use client";

import { useRouter } from "next/navigation";
import { AdminGammaIdeas } from "@/components/AdminGammaIdeas";
import type { GammaMarketDraft } from "@/lib/gamma";

export default function AdminIdeasPage() {
  const router = useRouter();

  function onApplyDraft(draft: GammaMarketDraft) {
    const params = new URLSearchParams({
      from: "gamma",
      gammaId: draft.sourceId,
    });
    router.push(`/admin/markets/new?${params.toString()}`);
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-white">Идеи (Gamma)</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Справочник Polymarket read-only → адаптация правил на Forecast
        </p>
      </header>
      <AdminGammaIdeas onApplyDraft={onApplyDraft} />
    </section>
  );
}
