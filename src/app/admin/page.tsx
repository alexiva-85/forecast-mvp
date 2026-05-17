import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  buildAdminOverview,
  fetchAdminMarkets,
  formatAdminVolume,
} from "@/lib/admin";
import { AdminActionQueue } from "@/components/admin/AdminActionQueue";
import { AdminQuickActions } from "@/components/admin/AdminQuickActions";
import { AdminChecksPanel } from "@/components/admin/AdminChecksPanel";
import { getPlatformSettings, formatFeePercent } from "@/lib/platform";

export default async function AdminOverviewPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [markets, platform] = await Promise.all([
    fetchAdminMarkets(supabase),
    getPlatformSettings(supabase),
  ]);
  const overview = buildAdminOverview(markets);
  const totalVolume = markets
    .filter((m) => !m.is_sandbox)
    .reduce((s, m) => s + m.stats.volume_usd, 0);

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Обзор
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Состояние платформы и задачи оператора
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          href="/admin/markets?tab=active"
          label="Активных рынков"
          value={String(overview.counts.active)}
        />
        <KpiCard
          href="/admin/resolve"
          label="Требуют резолва"
          value={String(overview.counts.needsResolve)}
          highlight={overview.counts.needsResolve > 0}
        />
        <KpiCard
          href="/admin/markets?tab=resolved"
          label="Завершённых"
          value={String(overview.counts.resolved)}
        />
        <KpiCard
          href="/admin/markets"
          label="Оборот"
          value={formatAdminVolume(totalVolume)}
          sub="без тестовых"
        />
      </section>

      <AdminQuickActions />

      <section>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Требует действия
        </h3>
        <AdminActionQueue
          items={overview.actions}
          sandboxUnresolved={overview.sandboxUnresolved}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <AdminChecksPanel
          missingRules={overview.counts.missingRules}
          missingClosesAt={overview.counts.missingClosesAt}
          sandboxCount={overview.counts.sandbox}
          sandboxUnresolved={overview.sandboxUnresolved}
        />
        <article className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
          <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Комиссия
          </h3>
          <p className="mt-3 text-zinc-200">
            {formatFeePercent(platform.tradeFeeRate)} с оборота
          </p>
          <p className="mt-1 text-zinc-400">
            Накоплено $
            {platform.feeBalance.toLocaleString("ru-RU", {
              maximumFractionDigits: 2,
            })}
          </p>
          <Link
            href="/admin/settings"
            className="mt-3 inline-block text-xs font-medium text-amber-400 hover:underline"
          >
            Настройки комиссии →
          </Link>
        </article>
      </section>
    </section>
  );
}

function KpiCard({
  href,
  label,
  value,
  highlight,
  sub,
}: {
  href: string;
  label: string;
  value: string;
  highlight?: boolean;
  sub?: string;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-xl border p-4 transition-colors hover:border-zinc-600 ${
        highlight
          ? "border-amber-500/35 bg-amber-500/5 hover:bg-amber-500/10"
          : "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900"
      }`}
    >
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-zinc-600">{sub}</p>}
    </Link>
  );
}
