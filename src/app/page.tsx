import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getMarkets, getPopularTags } from "@/lib/markets";
import { MarketCard } from "@/components/MarketCard";
import { MarketCatalogFilters } from "@/components/MarketCatalogFilters";
import { HomeOnboarding } from "@/components/HomeOnboarding";

export const metadata: Metadata = {
  title: "Каталог рынков",
  description:
    "Откройте прогнозные рынки по спорту и крипто. Тестовый баланс $10 000 при регистрации.",
  alternates: { canonical: "/" },
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; tag?: string }>;
}) {
  const { category = "all", q = "", tag = "" } = await searchParams;
  const supabase = await createClient();

  const [markets, popularTags] = await Promise.all([
    getMarkets(supabase, { category, q, tag }),
    getPopularTags(supabase),
  ]);

  const hasFilters = Boolean(q.trim() || tag);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <HomeOnboarding />

      <div id="markets" className="mb-8 scroll-mt-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Прогнозные рынки
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Покупайте доли исходов по цене от 1¢ до 99¢ — это оценка вероятности
          рынком.
        </p>
      </div>

      <MarketCatalogFilters
        category={category}
        q={q}
        tag={tag}
        popularTags={popularTags}
      />

      <div className="mt-6">
        {markets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
            <p>
              {hasFilters
                ? "Ничего не найдено — измените запрос или сбросьте фильтры"
                : "Рынки не найдены"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {markets.map((m) => (
              <MarketCard key={m.id} market={m} activeTag={tag} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
