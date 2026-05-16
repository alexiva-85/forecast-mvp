import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminResolveForm } from "@/components/AdminResolveForm";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-zinc-400">Доступ только для администратора.</p>
        <p className="mt-4 text-sm text-zinc-600">
          В Supabase SQL Editor выполните:
          <code className="mt-2 block rounded bg-zinc-900 p-3 text-left text-xs text-amber-400">
            update profiles set is_admin = true where id = &apos;ВАШ_USER_ID&apos;;
          </code>
        </p>
      </div>
    );
  }

  const { data: markets } = await supabase
    .from("markets")
    .select("*")
    .order("created_at");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-white">Админ</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Завершение рынков и фиксация исхода (тестовый режим)
      </p>

      <ul className="mt-8 space-y-6">
        {markets?.map((m) => (
          <li
            key={m.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
          >
            <h2 className="font-medium text-white">{m.title}</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Статус: {m.status}
              {m.resolved_side && ` · Исход: ${m.resolved_side}`}
            </p>
            {m.status === "open" && (
              <AdminResolveForm marketId={m.id} slug={m.slug} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
