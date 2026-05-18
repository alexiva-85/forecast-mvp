import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getMarketOutcomes, formatOutcomeLabel } from "@/lib/outcomes";
import { parseChecklist, type MarketStatus } from "@/lib/types";
import { AdminMarketSlug } from "@/components/admin/AdminMarketSlug";
import { AdminResolvePanel } from "@/components/admin/AdminResolvePanel";
import { adminStatusLabel } from "@/lib/admin";

export default async function AdminResolveMarketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;
  const supabase = await createClient();

  const { data: market } = await supabase
    .from("markets")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!market) notFound();

  const checklist = parseChecklist(market.resolution_checklist);
  const outcomes = await getMarketOutcomes(supabase, market.id);

  if (market.status === "resolved") {
    return (
      <section className="space-y-4">
        <Link href="/admin/resolve" className="text-xs text-zinc-500 hover:text-white">
          ← Очередь резолва
        </Link>
        <header className="mb-2">
          <h2 className="text-lg font-medium text-white">{market.title}</h2>
          <AdminMarketSlug slug={market.slug} className="mt-1" />
        </header>
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-sm text-zinc-400">
          Рынок уже завершён. Исход:{" "}
          <strong className="text-white">
            {formatOutcomeLabel(
              market.resolved_outcome_key ?? market.resolved_side ?? "",
              outcomes.find(
                (o) =>
                  o.outcome_key ===
                  (market.resolved_outcome_key ?? market.resolved_side),
              )?.label,
            )}
          </strong>
        </p>
      </section>
    );
  }

  if (market.status !== "closed") {
    return (
      <section className="space-y-4">
        <Link href="/admin/resolve" className="text-xs text-zinc-500 hover:text-white">
          ← Очередь резолва
        </Link>
        <header className="mb-2">
          <h2 className="text-lg font-medium text-white">{market.title}</h2>
          <AdminMarketSlug slug={market.slug} className="mt-1" />
        </header>
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-sm text-amber-200/90">
          Резолв доступен только после закрытия торгов. Сейчас:{" "}
          {adminStatusLabel(market.status as MarketStatus)}. Дождитесь даты
          закрытия или закройте
          торги вручную.
        </p>
        <Link
          href={`/market/${slug}`}
          className="text-sm text-emerald-400 hover:underline"
        >
          Открыть рынок на сайте
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <Link href="/admin/resolve" className="text-xs text-zinc-500 hover:text-white">
        ← Очередь резолва
      </Link>
      <AdminResolvePanel
        marketId={market.id}
        slug={market.slug}
        title={market.title}
        resolutionRules={market.resolution_rules}
        resolutionChecklist={checklist}
        outcomes={outcomes}
      />
    </section>
  );
}
