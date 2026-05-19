import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminGate } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { fetchAdminResolveReminder } from "@/lib/admin";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { AdminResolveReminderBanner } from "@/components/admin/AdminResolveReminderBanner";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await getAdminGate("/admin");

  if ("redirect" in gate) redirect(gate.redirect);
  if (!gate.isAdmin) return <AdminAccessDenied />;

  const supabase = await createClient();
  const resolveReminder = await fetchAdminResolveReminder(supabase);

  return (
    <section className="border-t border-zinc-900 bg-zinc-950">
      <section className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-7xl flex-col sm:flex-row">
        <aside className="w-full shrink-0 border-b border-zinc-800 px-4 py-4 sm:w-56 sm:border-b-0 sm:border-r sm:py-6 lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:overflow-y-auto">
          <header className="mb-5 px-1">
            <Link
              href="/"
              className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
            >
              ← На сайт
            </Link>
            <h1 className="mt-2 text-lg font-semibold text-white">Админка</h1>
            <p className="mt-0.5 text-xs text-zinc-600">
              Оператор · <span className="text-zinc-700">UI v1.1</span>
            </p>
          </header>
          <AdminNav resolveQueueCount={resolveReminder.count} />
        </aside>
        <article className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <AdminResolveReminderBanner
            count={resolveReminder.count}
            staleCount={resolveReminder.staleCount}
          />
          {children}
        </article>
      </section>
    </section>
  );
}
