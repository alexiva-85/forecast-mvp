"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/portfolio", label: "Обзор", exact: true },
  { href: "/portfolio/deposit", label: "Пополнить", exact: true },
  { href: "/portfolio/withdraw", label: "Вывести", exact: true },
  { href: "/portfolio/referral", label: "Пригласить", exact: true },
  { href: "/portfolio/positions", label: "Позиции", exact: false },
  { href: "/portfolio/orders", label: "Заявки", exact: false },
  { href: "/portfolio/activity", label: "История", exact: false },
  { href: "/profile", label: "Профиль", exact: true },
] as const;

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
      aria-label="Кабинет"
    >
      {links.map(({ href, label, exact }) => {
        const active = isActive(pathname, href, exact);
        return (
          <Link
            key={href}
            href={href}
            className={`shrink-0 rounded-md px-3 py-2 text-sm transition-colors lg:w-full ${
              active
                ? "bg-emerald-500/15 font-medium text-emerald-400"
                : "text-zinc-400 hover:bg-zinc-800/90 hover:text-zinc-100"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
