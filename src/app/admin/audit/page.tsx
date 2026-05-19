import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  adminAuditActionLabel,
  fetchAdminAuditLog,
} from "@/lib/admin";

function formatAuditTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminAuditPage() {
  await requireAdmin();
  const supabase = await createClient();
  const entries = await fetchAdminAuditLog(supabase, 80);

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Журнал действий
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Кто из операторов что сделал — для разбора инцидентов
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-500">
          Записей пока нет. Действия появятся после создания рынка, резолва,
          закрытия торгов и смены комиссии.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/30">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm text-zinc-200">{entry.summary}</p>
                <p className="text-xs text-zinc-500">
                  <span className="text-zinc-400">
                    {adminAuditActionLabel(entry.action)}
                  </span>
                  {entry.entity_slug && (
                    <>
                      {" · "}
                      {entry.entity_type === "market" ? (
                        <Link
                          href={`/market/${entry.entity_slug}`}
                          className="text-amber-400/90 hover:underline"
                        >
                          {entry.entity_slug}
                        </Link>
                      ) : (
                        entry.entity_slug
                      )}
                    </>
                  )}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs text-zinc-500">
                <p>{formatAuditTime(entry.created_at)}</p>
                <p className="mt-0.5 text-zinc-600">
                  {entry.admin_display_name ?? "Оператор"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
