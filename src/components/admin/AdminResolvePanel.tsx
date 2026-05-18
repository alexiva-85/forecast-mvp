"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminResolveMarket } from "@/app/actions/admin";
import { AdminMarketSlug } from "@/components/admin/AdminMarketSlug";
import type { MarketOutcome } from "@/lib/types";

export function AdminResolvePanel({
  marketId,
  slug,
  title,
  resolutionRules,
  resolutionChecklist,
  outcomes,
}: {
  marketId: string;
  slug: string;
  title: string;
  resolutionRules: string | null;
  resolutionChecklist: string[];
  outcomes: MarketOutcome[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [pendingOutcomeKey, setPendingOutcomeKey] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);

  const allChecked =
    resolutionChecklist.length === 0 ||
    resolutionChecklist.every((_, i) => checked[i]);

  const pendingLabel =
    outcomes.find((o) => o.outcome_key === pendingOutcomeKey)?.label ??
    pendingOutcomeKey;

  function toggleItem(index: number) {
    setChecked((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  function confirmResolve() {
    if (!pendingOutcomeKey || !allChecked) return;
    setMessage(null);
    startTransition(async () => {
      const result = await adminResolveMarket(
        marketId,
        pendingOutcomeKey,
        slug,
      );
      if (result.error) {
        setMessage(result.error);
        setPendingOutcomeKey(null);
      } else {
        router.push("/admin/resolve");
        router.refresh();
      }
    });
  }

  return (
    <section className="space-y-6 rounded-xl border border-amber-500/20 bg-zinc-900/50 p-6">
      <header>
        <h2 className="text-lg font-medium text-white">{title}</h2>
        <AdminMarketSlug slug={slug} className="mt-2" />
      </header>

      {resolutionRules && (
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Правила резолва
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            {resolutionRules}
          </p>
        </section>
      )}

      {resolutionChecklist.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Чеклист
          </h3>
          <ul className="space-y-2">
            {resolutionChecklist.map((item, i) => (
              <li key={item}>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!checked[i]}
                    onChange={() => toggleItem(i)}
                    className="mt-0.5 rounded border-zinc-600"
                  />
                  <span
                    className={checked[i] ? "text-zinc-200" : "text-zinc-500"}
                  >
                    {item}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!pendingOutcomeKey ? (
        <section className="space-y-3 border-t border-zinc-800 pt-4">
          <p className="text-sm text-zinc-400">Выберите исход после проверки:</p>
          <section className="flex flex-wrap gap-2">
            {outcomes.map((outcome) => (
              <button
                key={outcome.outcome_key}
                type="button"
                disabled={!allChecked}
                onClick={() => setPendingOutcomeKey(outcome.outcome_key)}
                className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-40"
              >
                {outcome.label}
              </button>
            ))}
          </section>
          {!allChecked && (
            <p className="text-xs text-zinc-600">
              Отметьте все пункты чеклиста
            </p>
          )}
        </section>
      ) : (
        <section className="space-y-4 rounded-lg border border-rose-500/30 bg-rose-500/5 p-4">
          <p className="text-sm text-rose-200/90">
            Подтвердите фиксацию исхода{" "}
            <strong>{pendingLabel}</strong>. Отменить будет нельзя.
          </p>
          <section className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={confirmResolve}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
            >
              {pending ? "Сохраняем…" : "Зафиксировать исход"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setPendingOutcomeKey(null)}
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
            >
              Назад
            </button>
          </section>
        </section>
      )}

      {message && <p className="text-sm text-rose-400">{message}</p>}
    </section>
  );
}
