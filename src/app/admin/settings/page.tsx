import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminFeeSettings } from "@/components/admin/AdminFeeSettings";
import { AdminFeeRateHistory } from "@/components/admin/AdminFeeRateHistory";
import { AdminGrantTestShares } from "@/components/admin/AdminGrantTestShares";
import { fetchAdminFeeRateHistory } from "@/lib/admin";
import { getPlatformSettings } from "@/lib/platform";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const platform = await getPlatformSettings(supabase);
  const feeHistory = await fetchAdminFeeRateHistory(supabase);

  return (
    <section className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold text-white">Настройки</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Параметры платформы для операторов
        </p>
      </header>

      <AdminFeeSettings
        tradeFeeRate={platform.tradeFeeRate}
        feeBalance={platform.feeBalance}
      />

      <AdminFeeRateHistory entries={feeHistory} />

      <AdminGrantTestShares />

      <article className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 text-sm">
        <h3 className="font-medium text-zinc-300">Лимиты (G2)</h3>
        <ul className="mt-2 space-y-1 text-zinc-500">
          <li>place_order — 30 запросов / мин</li>
          <li>cancel_order — 60 / мин</li>
          <li>redeem_positions — 10 / мин</li>
        </ul>
      </article>

      <details className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4 text-xs text-zinc-600">
        <summary className="cursor-pointer text-zinc-500">Для разработчиков</summary>
        <p className="mt-3">
          Выдать админа:{" "}
          <code className="text-amber-400/80">
            update profiles set is_admin = true where id = &apos;…&apos;;
          </code>
        </p>
      </details>
    </section>
  );
}
