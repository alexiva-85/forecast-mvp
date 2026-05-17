"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminResolveMarket } from "@/app/actions/admin";

export function AdminResolvePanel({
  marketId,
  slug,
  title,
  resolutionRules,
  resolutionChecklist,
}: {
  marketId: string;
  slug: string;
  title: string;
  resolutionRules: string | null;
  resolutionChecklist: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [pendingSide, setPendingSide] = useState<"yes" | "no" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const allChecked =
    resolutionChecklist.length === 0 ||
    resolutionChecklist.every((_, i) => checked[i]);

  function toggleItem(index: number) {
    setChecked((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  function confirmResolve() {
    if (!pendingSide || !allChecked) return;
    setMessage(null);
    startTransition(async () => {
      const result = await adminResolveMarket(marketId, pendingSide, slug);
      if (result.error) {
        setMessage(result.error);
        setPendingSide(null);
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
        <p className="mt-1 text-sm text-zinc-500">/{slug}</p>
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

      {!pendingSide ? (
        <section className="space-y-3 border-t border-zinc-800 pt-4">
          <p className="text-sm text-zinc-400">Выберите исход после проверки:</p>
          <section className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!allChecked}
              onClick={() => setPendingSide("yes")}
              className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-40"
            >
              Исход: Да
            </button>
            <button
              type="button"
              disabled={!allChecked}
              onClick={() => setPendingSide("no")}
              className="rounded-lg bg-rose-500/20 px-4 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/30 disabled:opacity-40"
            >
              Исход: Нет
            </button>
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
            <strong>{pendingSide === "yes" ? "Да" : "Нет"}</strong>. Отменить
            будет нельзя.
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
              onClick={() => setPendingSide(null)}
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
            >
              Назад
            </button>
          </section>
        </section>
      )}

      {message && (
        <p className="text-sm text-rose-400">{message}</p>
      )}
    </section>
  );
}
