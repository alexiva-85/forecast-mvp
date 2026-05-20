import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LeaderboardPeriodTabs } from "@/components/LeaderboardPeriodTabs";
import { UiListRow } from "@/components/UiListRow";
import { categoryLabel } from "@/lib/markets";
import {
  fetchLeaderboardMyRank,
  fetchLeaderboardSummary,
  fetchLeaderboardTopMarkets,
  fetchLeaderboardTraders,
  formatLeaderboardVolume,
  leaderboardPeriodLabel,
  parseLeaderboardPeriod,
} from "@/lib/leaderboard";

export const metadata: Metadata = {
  title: "Лидерборд",
  description:
    "Топ трейдеров и рынков по обороту на Forecast. Тестовые деньги, без sandbox-рынков.",
  alternates: { canonical: "/leaderboard" },
};

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = parseLeaderboardPeriod(periodParam);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [summary, traders, markets, myRank] = await Promise.all([
    fetchLeaderboardSummary(supabase, period),
    fetchLeaderboardTraders(supabase, period),
    fetchLeaderboardTopMarkets(supabase, period),
    user ? fetchLeaderboardMyRank(supabase, period) : Promise.resolve(null),
  ]);

  const periodLabel = leaderboardPeriodLabel(period).toLowerCase();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Лидерборд
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Оборот по сделкам за период. Тестовые рынки и sandbox не учитываются.
        </p>
      </header>

      <LeaderboardPeriodTabs period={period} />

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Оборот за {periodLabel}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
            {formatLeaderboardVolume(summary.volume_usd)}
          </p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Сделок</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
            {summary.trade_count.toLocaleString("ru-RU")}
          </p>
        </article>
      </section>

      {myRank && (
        <p className="mt-4 rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
          Вы на {myRank.rank}-м месте · {formatLeaderboardVolume(myRank.volume_usd)}{" "}
          · {myRank.trade_count} сделок
        </p>
      )}

      {!user && (
        <p className="mt-4 text-sm text-zinc-500">
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300">
            Войдите
          </Link>
          , чтобы увидеть своё место в рейтинге.
        </p>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-sm font-medium text-zinc-400">Топ трейдеров</h2>
          {traders.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-600">
              Пока нет сделок за этот период
            </p>
          ) : (
            <ol className="mt-4 divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-zinc-900/30">
              {traders.map((row) => (
                <li key={row.user_id} className="px-4 py-3">
                  <UiListRow
                    actionLine={
                      <>
                        <span className="mr-2 text-zinc-600">{row.rank}.</span>
                        {row.display_label}
                      </>
                    }
                    termsLine={`${row.trade_count} сделок`}
                    right={
                      <span className="text-sm font-medium tabular-nums text-zinc-300">
                        {formatLeaderboardVolume(row.volume_usd)}
                      </span>
                    }
                  />
                </li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium text-zinc-400">Топ рынков</h2>
          {markets.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-600">
              Пока нет сделок за этот период
            </p>
          ) : (
            <ol className="mt-4 divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-zinc-900/30">
              {markets.map((row) => (
                <li key={row.market_id}>
                  <Link
                    href={`/market/${row.slug}`}
                    className="block px-4 py-3 transition-colors hover:bg-zinc-800/40"
                  >
                    <UiListRow
                      actionLine={
                        <>
                          <span className="mr-2 text-zinc-600">{row.rank}.</span>
                          <span className="line-clamp-2">{row.title}</span>
                        </>
                      }
                      termsLine={
                        <>
                          {formatLeaderboardVolume(row.volume_usd)} ·{" "}
                          {row.trade_count} сделок · {categoryLabel(row.category)}
                        </>
                      }
                    />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
