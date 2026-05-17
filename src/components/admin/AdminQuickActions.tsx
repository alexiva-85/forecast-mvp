import Link from "next/link";

const actions = [
  { href: "/admin/markets/new", label: "Создать рынок", primary: true },
  { href: "/admin/ideas", label: "Найти идею" },
  { href: "/admin/resolve", label: "К резолву" },
  { href: "/admin/markets?tab=active", label: "Активные рынки" },
  { href: "/admin/settings", label: "Комиссия" },
] as const;

export function AdminQuickActions() {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Быстрые действия
      </h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {actions.map((action) => (
          <li key={action.href}>
            <Link
              href={action.href}
              className={`inline-block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                "primary" in action && action.primary
                  ? "bg-amber-500 text-zinc-950 hover:bg-amber-400"
                  : "border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500"
              }`}
            >
              {action.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
