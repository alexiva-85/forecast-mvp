import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminReportRow } from "@/components/admin/AdminReportRow";
import type { AdminContentReport } from "@/lib/content-reports";

const TABS = [
  { id: "pending", label: "Ожидают" },
  { id: "all", label: "Все" },
  { id: "action_taken", label: "С мерами" },
  { id: "dismissed", label: "Отклонённые" },
] as const;

type ReportTab = (typeof TABS)[number]["id"];

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin();
  const { tab: tabRaw = "pending" } = await searchParams;
  const tab: ReportTab = TABS.some((t) => t.id === tabRaw)
    ? (tabRaw as ReportTab)
    : "pending";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_reports_list", {
    p_status: tab,
    p_limit: 80,
    p_offset: 0,
  });

  if (error) throw error;

  const reports = (data ?? []) as AdminContentReport[];

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Жалобы
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Модерация контента от пользователей (D6)
        </p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const params = new URLSearchParams();
          if (t.id !== "pending") params.set("tab", t.id);
          const qs = params.toString();
          return (
            <Link
              key={t.id}
              href={`/admin/reports${qs ? `?${qs}` : ""}`}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                tab === t.id
                  ? "bg-zinc-700 text-white"
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {reports.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-500">
          {tab === "pending"
            ? "Новых жалоб нет."
            : "В этой вкладке записей нет."}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/30">
          {reports.map((report) => (
            <AdminReportRow key={report.id} report={report} />
          ))}
        </ul>
      )}
    </section>
  );
}
