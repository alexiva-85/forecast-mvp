import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { MobileNav } from "@/components/MobileNav";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("balance, display_name, is_admin")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  const navLinks = [
    { href: "/", label: "Рынки" },
    { href: "/leaderboard", label: "Лидерборд" },
    ...(user ? [{ href: "/portfolio", label: "Кабинет" }] : []),
    ...(profile?.is_admin
      ? [{ href: "/admin", label: "Админ", accent: true }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link
          href="/"
          className="shrink-0 text-lg font-semibold tracking-tight text-white"
        >
          Forecast<span className="text-emerald-400">MVP</span>
        </Link>

        <nav
          className="hidden items-center gap-4 text-sm text-zinc-400 md:flex"
          aria-label="Основная навигация"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`transition-colors hover:text-white ${
                link.accent ? "text-amber-400/90 hover:text-amber-300" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 text-sm md:flex">
          {user && profile ? (
            <>
              <Link
                href="/profile"
                className="max-w-[10rem] truncate text-zinc-500 transition-colors hover:text-white"
              >
                {profile.display_name ?? user.email}
              </Link>
              <Link
                href="/portfolio"
                className="rounded-full bg-emerald-500/15 px-3 py-1 font-medium text-emerald-400"
              >
                $
                {Number(profile.balance).toLocaleString("ru-RU", {
                  maximumFractionDigits: 0,
                })}
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-white px-4 py-1.5 font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
            >
              Войти
            </Link>
          )}
        </div>

        <MobileNav
          links={navLinks}
          isLoggedIn={!!user}
          userEmail={user?.email}
          displayName={profile?.display_name}
          balance={profile?.balance != null ? Number(profile.balance) : null}
        />
      </div>
    </header>
  );
}
