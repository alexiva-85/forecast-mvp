"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Обзор", exact: true },
  { href: "/admin/markets", label: "Рынки", exact: false },
  { href: "/admin/markets/new", label: "Создать", exact: false },
  { href: "/admin/resolve", label: "Резолв", exact: false },
  { href: "/admin/ideas", label: "Идеи", exact: false },
  { href: "/admin/audit", label: "Журнал", exact: false },
  { href: "/admin/settings", label: "Настройки", exact: false },
] as const;

export function AdminNav({
  resolveQueueCount = 0,
}: {
  resolveQueueCount?: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {links.map(({ href, label, exact }) => {
        const active = exact
          ? pathname === href
          : href === "/admin/markets"
            ? pathname.startsWith("/admin/markets") &&
              !pathname.startsWith("/admin/markets/new")
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-amber-500/15 font-medium text-amber-400"
                : "text-zinc-400 hover:bg-zinc-800/90 hover:text-zinc-100"
            }`}
          >
            <span>{label}</span>
            {href === "/admin/resolve" && resolveQueueCount > 0 && (
              <span className="rounded-full bg-amber-500/25 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-amber-300">
                {resolveQueueCount > 99 ? "99+" : resolveQueueCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
