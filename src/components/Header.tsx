import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";

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

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          Forecast<span className="text-emerald-400">MVP</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-zinc-400">
          <Link href="/" className="transition-colors hover:text-white">
            Рынки
          </Link>
          {user && (
            <Link
              href="/portfolio"
              className="transition-colors hover:text-white"
            >
              Кабинет
            </Link>
          )}
          {profile?.is_admin && (
            <Link href="/admin" className="transition-colors hover:text-amber-400">
              Админ
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          {user && profile ? (
            <>
              <Link
                href="/profile"
                className="hidden text-zinc-500 transition-colors hover:text-white sm:inline"
              >
                {profile.display_name ?? user.email}
              </Link>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-medium text-emerald-400">
                $
                {Number(profile.balance).toLocaleString("ru-RU", {
                  maximumFractionDigits: 0,
                })}
              </span>
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
      </div>
    </header>
  );
}
