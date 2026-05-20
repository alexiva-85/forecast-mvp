import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getMarketBySlug,
  categoryLabel,
  formatPrice,
  formatClosesAt,
} from "@/lib/markets";
import { MarketStatusChip } from "@/components/MarketStatusChip";
import { TradePanel } from "@/components/TradePanel";
import { MarketLiveData } from "@/components/MarketLiveData";
import { OpenOrdersList } from "@/components/OpenOrdersList";
import { ResolutionRules } from "@/components/ResolutionRules";
import { parseChecklist, parseTags } from "@/lib/types";
import Link from "next/link";
import { getPlatformSettings } from "@/lib/platform";
import { buildOutcomeLabelMap } from "@/lib/outcomes";
import { MarketReportButton } from "@/components/MarketReportButton";
import {
  isMarketIndexable,
  marketMetaDescription,
  marketOgSubtitle,
} from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const market = await getMarketBySlug(supabase, slug);

  if (!market) {
    return { title: "Рынок не найден" };
  }

  const description = marketMetaDescription(market);
  const ogSubtitle = marketOgSubtitle(market);
  const indexable = isMarketIndexable(market);

  return {
    title: market.title,
    description,
    alternates: { canonical: `/market/${slug}` },
    robots: indexable ? undefined : { index: false, follow: false },
    openGraph: {
      title: market.title,
      description: ogSubtitle,
      url: `/market/${slug}`,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: market.title,
      description: ogSubtitle,
    },
  };
}

export default async function MarketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const market = await getMarketBySlug(supabase, slug);

  if (!market) notFound();

  const isDraft = market.status === "draft";
  const isSandboxHidden = market.is_sandbox;

  const platform = await getPlatformSettings(supabase);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const outcomeShares: Record<string, number> = {};
  for (const outcome of market.outcomes) {
    outcomeShares[outcome.outcome_key] = 0;
  }
  if (user) {
    const { data: positions } = await supabase
      .from("positions")
      .select("side, shares")
      .eq("market_id", market.id)
      .eq("user_id", user.id);
    for (const p of positions ?? []) {
      outcomeShares[p.side as string] = Number(p.shares) || 0;
    }
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

  const outcomeLabels = buildOutcomeLabelMap(market.outcomes);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      {(isDraft || isSandboxHidden) && (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
          {isDraft
            ? "Черновик — рынок не показывается в каталоге. Опубликуйте в админке (вкладка «Черновики»)."
            : "Тестовый рынок — скрыт из публичного каталога."}
        </p>
      )}
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
        <span>{categoryLabel(market.category)}</span>
        <span>·</span>
        <MarketStatusChip status={market.status} />
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

      <h1 className="text-xl font-semibold leading-tight text-white sm:text-2xl">
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

      <div className="mt-6 space-y-4">
        <ResolutionRules
          rules={market.resolution_rules}
          checklist={parseChecklist(market.resolution_checklist)}
        />
        <MarketReportButton
          marketSlug={market.slug}
          marketTitle={market.title}
          isLoggedIn={!!user}
        />
      </div>

      <div className="mt-6 grid gap-6 sm:mt-8 sm:gap-8 lg:grid-cols-5">
        <div className="order-2 space-y-6 lg:order-1 lg:col-span-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
            <h2 className="mb-3 text-sm font-medium text-zinc-400">
              {market.outcome_mode === "multi"
                ? "Исходы"
                : "Текущая вероятность «Да»"}
            </h2>
            {market.outcome_mode === "multi" ? (
              <ul className="space-y-2">
                {market.outcomes.map((o) => (
                  <li
                    key={o.outcome_key}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-zinc-300">{o.label}</span>
                    <span className="font-semibold text-emerald-400">
                      {formatPrice(market.outcome_prices[o.outcome_key] ?? 0.5)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-4xl font-semibold text-emerald-400">
                {formatPrice(market.yes_price)}
              </p>
            )}
          </div>

          <MarketLiveData
            marketId={market.id}
            initialOrders={initialOrders}
            initialTrades={initialTrades}
            outcomeLabels={outcomeLabels}
          />
        </div>

        <div className="order-1 space-y-4 lg:order-2 lg:col-span-2">
          <TradePanel
            market={market}
            userId={user?.id ?? null}
            outcomeShares={outcomeShares}
            tradeFeeRate={platform.tradeFeeRate}
          />
          {user && userOpenOrders.length > 0 && (
            <OpenOrdersList
              userId={user.id}
              marketId={market.id}
              slug={market.slug}
              initialOrders={userOpenOrders}
              outcomeLabels={outcomeLabels}
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
