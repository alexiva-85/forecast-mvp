"use client";

import { useState, useTransition } from "react";
import { fetchGammaIdeas } from "@/app/actions/gamma";
import type { GammaMarketDraft, GammaMarketIdea } from "@/lib/gamma";
import { categoryLabel } from "@/lib/markets";

export function AdminGammaIdeas({
  onApplyDraft,
}: {
  onApplyDraft: (draft: GammaMarketDraft) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [ideas, setIdeas] = useState<GammaMarketIdea[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  function load(searchQuery?: string) {
    setError(null);
    startTransition(async () => {
      const result = await fetchGammaIdeas(searchQuery);
      if ("error" in result) {
        setError(result.error);
        setIdeas([]);
      } else {
        setIdeas(result.ideas);
        if (result.ideas.length === 0) {
          setError("Ничего не найдено. Попробуйте другой запрос.");
        }
      }
      setLoaded(true);
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(query.trim() || undefined);
  }

  return (
    <section className="rounded-xl border border-zinc-700/80 bg-zinc-900/30 p-5">
      <h2 className="text-lg font-medium text-white">Идеи с Polymarket (Gamma)</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Только справочник read-only. Торговля и резолв — на Forecast; правила нужно
        адаптировать.
      </p>

      <form onSubmit={handleSearch} className="mt-4 flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск: bitcoin, election, champions league…"
          className="min-w-[200px] flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 disabled:opacity-50"
        >
          {pending ? "Загрузка…" : "Найти"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setQuery("");
            load();
          }}
          className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 disabled:opacity-50"
        >
          Популярные
        </button>
      </form>

      {error && (
        <p className={`mt-3 text-sm ${ideas.length ? "text-zinc-500" : "text-rose-400"}`}>
          {error}
        </p>
      )}

      {loaded && ideas.length > 0 && (
        <ul className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
          {ideas.map((idea) => (
            <li
              key={idea.id}
              className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3"
            >
              <p className="text-sm font-medium leading-snug text-white">
                {idea.question}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span className="rounded bg-zinc-800 px-1.5 py-0.5">
                  {categoryLabel(idea.category)}
                </span>
                {idea.yesPrice != null && (
                  <span>Да ≈ {Math.round(idea.yesPrice * 100)}¢</span>
                )}
                {idea.volumeUsd != null && idea.volumeUsd > 0 && (
                  <span>объём ${formatCompactUsd(idea.volumeUsd)}</span>
                )}
                {idea.endDate && (
                  <span>до {formatDateRu(idea.endDate)}</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onApplyDraft(idea.draft)}
                  className="rounded-md bg-emerald-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                >
                  Создать из идеи
                </button>
                <a
                  href={idea.polymarketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  На Polymarket ↗
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatCompactUsd(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toFixed(0);
}

function formatDateRu(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
