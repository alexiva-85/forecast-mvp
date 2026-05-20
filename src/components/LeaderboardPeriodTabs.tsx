import Link from "next/link";
import type { LeaderboardPeriod } from "@/lib/leaderboard";
import { leaderboardPeriodLabel } from "@/lib/leaderboard";

const PERIODS: LeaderboardPeriod[] = ["7d", "30d", "all"];

export function LeaderboardPeriodTabs({
  period,
}: {
  period: LeaderboardPeriod;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PERIODS.map((p) => (
        <Link
          key={p}
          href={p === "7d" ? "/leaderboard" : `/leaderboard?period=${p}`}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            period === p
              ? "bg-white text-zinc-900"
              : "bg-zinc-900 text-zinc-400 hover:text-white"
          }`}
        >
          {leaderboardPeriodLabel(p)}
        </Link>
      ))}
    </div>
  );
}
