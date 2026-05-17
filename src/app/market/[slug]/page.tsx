import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getMarketBySlug,
  categoryLabel,
  formatPrice,
  marketStatusLabel,
  formatClosesAt,
} from "@/lib/markets";
import { TradePanel } from "@/components/TradePanel";
import { MarketLiveData } from "@/components/MarketLiveData";
import { OpenOrdersList } from "@/components/OpenOrdersList";
import { ResolutionRules } from "@/components/ResolutionRules";
import { parseChecklist, parseTags } from "@/lib/types";
import Link from "next/link";
import { getPlatformSettings } from "@/lib/platform";

export default async function MarketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const market = await getMarketBySlug(supabase, slug);

  if (!market) notFound();

  const platform = await getPlatformSettings(supabase);

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
    .select("id, side, price, size, fee_amount")
    .eq("market_id", market.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: orders } = await supabase
    .from("orders")
    .select("side, direction, price, remaining")
    .eq("market_id", market.id)
    .eq("status", "open")
    .order("price", { ascending: false });

  let userOpenOrders: Awaited<ReturnType<typeof fetchUserOpenOrders>> = [];
  if (user) {
    userOpenOrders = await fetchUserOpenOrders(supabase, user.id, market.id);
  }

  const initialOrders =
    orders?.map((o) => ({
      side: o.side,
      direction: o.direction,
      price: Number(o.price),
      remaining: Number(o.remaining),
    })) ?? [];

  const initialTrades =
    trades?.map((t) => ({
      id: t.id,
      side: t.side,
      price: Number(t.price),
      size: Number(t.size),
      fee_amount: Number(t.fee_amount ?? 0),
    })) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
        <span>{categoryLabel(market.category)}</span>
        <span>·</span>
        <span>{marketStatusLabel(market.status)}</span>
        {formatClosesAt(market.closes_at) && (
          <>
            <span>·</span>
            <span>
              {market.status === "open"
                ? `Торги до ${formatClosesAt(market.closes_at)}`
                : `Закрытие: ${formatClosesAt(market.closes_at)}`}
            </span>
          </>
        )}
      </div>

      <h1 className="text-2xl font-semibold leading-tight text-white">
        {market.title}
      </h1>
      {market.description && (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          {market.description}
        </p>
      )}

      {parseTags(market.tags).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {parseTags(market.tags).map((t) => (
            <Link
              key={t}
              href={`/?tag=${encodeURIComponent(t)}`}
              className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400 hover:text-emerald-400"
            >
              #{t}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6">
        <ResolutionRules
          rules={market.resolution_rules}
          checklist={parseChecklist(market.resolution_checklist)}
        />
      </div>

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

          <MarketLiveData
            marketId={market.id}
            initialOrders={initialOrders}
            initialTrades={initialTrades}
          />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <TradePanel
            market={market}
            userId={user?.id ?? null}
            yesShares={yesShares}
            noShares={noShares}
            tradeFeeRate={platform.tradeFeeRate}
          />
          {user && userOpenOrders.length > 0 && (
            <OpenOrdersList
              userId={user.id}
              marketId={market.id}
              slug={market.slug}
              initialOrders={userOpenOrders}
            />
          )}
        </div>
      </div>
    </div>
  );
}

async function fetchUserOpenOrders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  marketId: string,
) {
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .eq("market_id", marketId)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  return data ?? [];
}
