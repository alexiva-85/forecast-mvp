import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminMarketWizard } from "@/components/admin/AdminMarketWizard";
import { mapGammaMarketToDraft } from "@/lib/gamma";

export default async function AdminNewMarketPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; gammaId?: string }>;
}) {
  await requireAdmin();
  const { from, gammaId } = await searchParams;

  let draft = null;
  if (from === "gamma" && gammaId) {
    draft = await loadGammaDraft(gammaId);
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-white">Создать рынок</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Три шага: основное → условия и резолв → проверка и публикация
        </p>
      </header>
      <AdminMarketWizard draft={draft} />
    </section>
  );
}

async function loadGammaDraft(id: string) {
  try {
    const res = await fetch(
      `https://gamma-api.polymarket.com/markets/${id}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return mapGammaMarketToDraft(data);
  } catch {
    return null;
  }
}
