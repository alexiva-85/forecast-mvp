import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMarketBySlug, categoryLabel, formatPrice } from "@/lib/markets";
import { TradePanel } from "@/components/TradePanel";

export default async function MarketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const market = await getMarketBySlug(supabase, slug);

  if (!market) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let yesShares = 0;
  let noShares = 0;
  if (user) {
    const { data: positions } = await supabase
      .from("positions")
      .select("side, shares")
      .eq("market_id", market.id)
      .eq("user_id", user.id);
    yesShares =
      Number(positions?.find((p) => p.side === "yes")?.shares) || 0;
    noShares = Number(positions?.find((p) => p.side === "no")?.shares) || 0;
  }

  const { data: trades } = await supabase
    .from("trades")
    .select("*")
    .eq("market_id", market.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: orders } = await supabase
    .from("orders")
    .select("side, direction, price, remaining")
    .eq("market_id", market.id)
    .eq("status", "open")
    .order("price", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
        <span>{categoryLabel(market.category)}</span>
        <span>·</span>
        <span className="capitalize">{market.status}</span>
      </div>

      <h1 className="text-2xl font-semibold leading-tight text-white">
        {market.title}
      </h1>
      {market.description && (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          {market.description}
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
            <h2 className="mb-3 text-sm font-medium text-zinc-400">
              Текущая вероятность «Да»
            </h2>
            <p className="text-4xl font-semibold text-emerald-400">
              {formatPrice(market.yes_price)}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
            <h2 className="mb-3 text-sm font-medium text-zinc-400">Стакан</h2>
            {!orders?.length ? (
              <p className="text-sm text-zinc-600">Нет открытых заявок</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-zinc-500">
                    <th className="pb-2">Сторона</th>
                    <th className="pb-2">Тип</th>
                    <th className="pb-2">Цена</th>
                    <th className="pb-2 text-right">Объём</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={i} className="border-t border-zinc-800/50">
                      <td className="py-2 capitalize">
                        {o.side === "yes" ? "Да" : "Нет"}
                      </td>
                      <td className="py-2">
                        {o.direction === "buy" ? "Покупка" : "Продажа"}
                      </td>
                      <td className="py-2">{formatPrice(Number(o.price))}</td>
                      <td className="py-2 text-right">{o.remaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
            <h2 className="mb-3 text-sm font-medium text-zinc-400">
              Последние сделки
            </h2>
            {!trades?.length ? (
              <p className="text-sm text-zinc-600">Сделок пока нет</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {trades.map((t) => (
                  <li
                    key={t.id}
                    className="flex justify-between border-b border-zinc-800/50 pb-2"
                  >
                    <span>
                      {t.side === "yes" ? "Да" : "Нет"} · {formatPrice(Number(t.price))}
                    </span>
                    <span className="text-zinc-500">{t.size} долей</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <TradePanel
            market={market}
            userId={user?.id ?? null}
            yesShares={yesShares}
            noShares={noShares}
          />
        </div>
      </div>
    </div>
  );
}
