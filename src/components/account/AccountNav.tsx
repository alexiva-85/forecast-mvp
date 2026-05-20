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
    <div className="relative -mx-4 lg:mx-0">
      <nav
        className="account-nav-scroll flex gap-1.5 overflow-x-auto px-4 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden"
        aria-label="Кабинет"
      >
        {links.map(({ href, label, exact }) => {
          const active = isActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`shrink-0 rounded-md px-3 py-2.5 text-sm transition-colors lg:w-full lg:py-2 ${
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
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-zinc-950 via-zinc-950/80 to-transparent lg:hidden"
        aria-hidden
      />
    </div>
  );
}
