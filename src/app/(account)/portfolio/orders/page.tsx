import Link from "next/link";
import { requireAccountUser } from "@/lib/account-auth";
import {
  buildOutcomeLabelsBySlug,
  collectMarketIdsFromAccountData,
  fetchUserOpenOrders,
} from "@/lib/account-data";
import { OpenOrdersList } from "@/components/OpenOrdersList";

export default async function PortfolioOrdersPage() {
  const { supabase, user } = await requireAccountUser("/portfolio/orders");
  const openOrders = await fetchUserOpenOrders(supabase, user.id);
  const marketIds = collectMarketIdsFromAccountData({ orders: openOrders });
  const { byMarketId } = await buildOutcomeLabelsBySlug(supabase, marketIds);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Заявки</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Лимитные ордера, ожидающие исполнения
        </p>
      </header>

      {openOrders.length > 0 ? (
        <OpenOrdersList
          userId={user.id}
          initialOrders={openOrders}
          showMarket
          showHeading={false}
          outcomeLabelsByMarket={byMarketId}
        />
      ) : (
        <p className="text-sm text-zinc-600">
          Нет открытых заявок.{" "}
          <Link href="/" className="text-emerald-400 hover:text-emerald-300">
            Перейти к рынкам
          </Link>
        </p>
      )}
    </div>
  );
}
