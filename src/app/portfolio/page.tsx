import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OpenOrdersList } from "@/components/OpenOrdersList";

export default async function PortfolioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/portfolio");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: positions } = await supabase
    .from("positions")
    .select("*, markets(id, slug, title, status, resolved_side)")
    .eq("user_id", user.id)
    .gt("shares", 0);

  const { data: openOrders } = await supabase
    .from("orders")
    .select("*, markets(slug, title)")
    .eq("user_id", user.id)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-white">Портфель</h1>
      <p className="mt-2 text-3xl font-semibold text-emerald-400">
        ${Number(profile?.balance ?? 0).toLocaleString("ru-RU", { maximumFractionDigits: 2 })}
      </p>
      <p className="text-sm text-zinc-500">Доступный тестовый баланс</p>

      {openOrders && openOrders.length > 0 && (
        <div className="mt-10">
          <OpenOrdersList
            userId={user.id}
            initialOrders={openOrders}
            showMarket
          />
        </div>
      )}

      <h2 className="mt-10 mb-4 text-sm font-medium text-zinc-400">Позиции</h2>
      {!positions?.length ? (
        <p className="text-sm text-zinc-600">Нет открытых позиций</p>
      ) : (
        <ul className="space-y-3">
          {positions.map((p) => {
            const m = p.markets as {
              slug: string;
              title: string;
              status: string;
              resolved_side: string | null;
            };
            return (
              <li
                key={`${p.market_id}-${p.side}`}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
              >
                <Link
                  href={`/market/${m.slug}`}
                  className="font-medium text-white hover:text-emerald-400"
                >
                  {m.title}
                </Link>
                <div className="mt-2 flex justify-between text-sm">
                  <span>
                    {p.side === "yes" ? "Да" : "Нет"} · {p.shares} долей
                  </span>
                  <span className="text-zinc-500 capitalize">{m.status}</span>
                </div>
                {m.status === "resolved" && (
                  <p className="mt-1 text-xs text-amber-400">
                    Исход: {m.resolved_side === "yes" ? "Да" : "Нет"} — получите $1 за
                    выигрышную долю на странице рынка
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
