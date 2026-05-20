import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminMarketEditForm } from "@/components/admin/AdminMarketEditForm";
import { parseChecklist, parseTags, type Market } from "@/lib/types";

export default async function AdminMarketEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;
  const { saved } = await searchParams;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("markets")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) notFound();

  const market: Market = {
    ...(data as Market),
    tags: parseTags(data.tags),
    resolution_checklist: parseChecklist(data.resolution_checklist),
    is_sandbox: Boolean(data.is_sandbox),
  };

  if (market.status === "resolved") {
    redirect(`/admin/markets?tab=resolved`);
  }

  return (
    <section className="space-y-6">
      <header>
        <Link
          href="/admin/markets"
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          ← Рынки
        </Link>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          Редактирование
        </h2>
        <p className="mt-1 text-sm text-zinc-500">{market.title}</p>
        {saved === "1" && (
          <p className="mt-2 text-sm text-emerald-400">Изменения сохранены</p>
        )}
      </header>
      <AdminMarketEditForm market={market} />
    </section>
  );
}
