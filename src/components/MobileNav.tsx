"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/SignOutButton";

type NavLink = { href: string; label: string; accent?: boolean };

export function MobileNav({
  links,
  userEmail,
  displayName,
  balance,
  isLoggedIn,
}: {
  links: NavLink[];
  userEmail?: string | null;
  displayName?: string | null;
  balance?: number | null;
  isLoggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="flex items-center gap-2 md:hidden">
      {isLoggedIn && balance != null && (
        <Link
          href="/portfolio"
          onClick={() => setOpen(false)}
          className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-400"
        >
          $
          {Number(balance).toLocaleString("ru-RU", {
            maximumFractionDigits: 0,
          })}
        </Link>
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Закрыть меню" : "Открыть меню"}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-300 transition hover:border-zinc-600 hover:text-white"
      >
        <MenuIcon open={open} />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Закрыть меню"
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <nav
            id="mobile-nav-panel"
            className="fixed inset-y-0 right-0 z-[70] flex w-[min(100vw-3rem,18rem)] flex-col border-l border-zinc-800 bg-zinc-950 px-4 py-5 shadow-2xl"
            style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="text-sm font-medium text-white">Меню</span>
              <button
                type="button"
                aria-label="Закрыть"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-white"
              >
                <span aria-hidden className="text-xl leading-none">
                  ×
                </span>
              </button>
            </div>

            <ul className="flex flex-col gap-1">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-lg px-3 py-3 text-base font-medium transition ${
                      link.accent
                        ? "text-amber-400 hover:bg-zinc-900"
                        : "text-zinc-200 hover:bg-zinc-900"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div
              className="mt-auto border-t border-zinc-800 pt-4"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              {isLoggedIn ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setOpen(false)}
                    className="block truncate px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300"
                  >
                    {displayName ?? userEmail}
                  </Link>
                  <div className="px-3 py-2">
                    <SignOutButton />
                  </div>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg bg-white px-4 py-3 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-200"
                >
                  Войти
                </Link>
              )}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden
    >
      {open ? (
        <>
          <path d="M5 5l10 10" />
          <path d="M15 5L5 15" />
        </>
      ) : (
        <>
          <path d="M3 6h14" />
          <path d="M3 10h14" />
          <path d="M3 14h14" />
        </>
      )}
    </svg>
  );
}
