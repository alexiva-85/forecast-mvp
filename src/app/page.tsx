import { createClient } from "@/lib/supabase/server";
import { getMarkets } from "@/lib/markets";
import { MarketCard } from "@/components/MarketCard";
import Link from "next/link";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category = "all" } = await searchParams;
  const supabase = await createClient();
  const markets = await getMarkets(supabase, category);

  const tabs = [
    { id: "all", label: "Все" },
    { id: "sport", label: "Спорт" },
    { id: "crypto", label: "Крипто" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Прогнозные рынки
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Покупайте доли «Да» или «Нет». Тестовый баланс $10&nbsp;000 при регистрации.
        </p>
      </div>

      <div className="mb-6 flex gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.id === "all" ? "/" : `/?category=${tab.id}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              category === tab.id
                ? "bg-white text-zinc-900"
                : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {markets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
          <p>Рынки не найдены.</p>
          <p className="mt-2 text-sm">
            Выполните миграцию и seed в Supabase (см. README).
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((m) => (
            <MarketCard key={m.id} market={m} />
          ))}
        </div>
      )}
    </div>
  );
}
