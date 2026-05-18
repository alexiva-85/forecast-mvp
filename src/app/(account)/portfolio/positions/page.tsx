import { requireAccountUser } from "@/lib/account-auth";
import {
  buildOutcomeLabelsBySlug,
  collectMarketIdsFromAccountData,
  fetchUserPositions,
} from "@/lib/account-data";
import { PositionsList, type PositionRow } from "@/components/account/PositionsList";

export default async function PortfolioPositionsPage() {
  const { supabase, user } = await requireAccountUser("/portfolio/positions");
  const positions = await fetchUserPositions(supabase, user.id);
  const marketIds = collectMarketIdsFromAccountData({ positions });
  const { byMarketId } = await buildOutcomeLabelsBySlug(supabase, marketIds);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Позиции</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ваши доли по открытым и завершённым рынкам
        </p>
      </header>
      <PositionsList
        positions={positions as PositionRow[]}
        outcomeLabelsByMarketId={byMarketId}
      />
    </div>
  );
}
