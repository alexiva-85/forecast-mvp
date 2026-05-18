import { requireAccountUser } from "@/lib/account-auth";
import {
  buildOutcomeLabelsBySlug,
  fetchUserActivity,
  resolveActivityMarketIds,
} from "@/lib/account-data";
import { ActivityHistory } from "@/components/ActivityHistory";

export default async function PortfolioActivityPage() {
  const { supabase } = await requireAccountUser("/portfolio/activity");
  const activities = await fetchUserActivity(supabase, 100);

  const activitySlugs = [
    ...new Set(
      activities
        .map((row) => row.market_slug)
        .filter((slug): slug is string => Boolean(slug)),
    ),
  ];

  const marketIds = await resolveActivityMarketIds(supabase, activitySlugs, []);
  const { bySlug } = await buildOutcomeLabelsBySlug(supabase, marketIds);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">История операций</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Сделки, отмены заявок и выплаты
        </p>
      </header>
      <ActivityHistory
        activities={activities}
        outcomeLabelsBySlug={bySlug}
      />
    </div>
  );
}
