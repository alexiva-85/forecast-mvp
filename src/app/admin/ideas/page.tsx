import { AdminGammaIdeas } from "@/components/AdminGammaIdeas";

export default function AdminIdeasPage() {
  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-white">Идеи (Gamma)</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Справочник Polymarket read-only → черновик в один клик или мастер
        </p>
      </header>
      <AdminGammaIdeas />
    </section>
  );
}
