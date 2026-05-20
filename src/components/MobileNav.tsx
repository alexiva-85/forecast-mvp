"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      document.documentElement.removeAttribute("data-mobile-nav-open");
      return;
    }
    document.documentElement.setAttribute("data-mobile-nav-open", "");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.documentElement.removeAttribute("data-mobile-nav-open");
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const drawer =
    mounted && open
      ? createPortal(
          <MobileNavDrawer
            links={links}
            isLoggedIn={isLoggedIn}
            userEmail={userEmail}
            displayName={displayName}
            onClose={() => setOpen(false)}
          />,
          document.body,
        )
      : null;

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

      {drawer}
    </div>
  );
}

function MobileNavDrawer({
  links,
  isLoggedIn,
  userEmail,
  displayName,
  onClose,
}: {
  links: NavLink[];
  isLoggedIn: boolean;
  userEmail?: string | null;
  displayName?: string | null;
  onClose: () => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Закрыть меню"
        className="fixed inset-0 z-[100] bg-black/70"
        onClick={onClose}
      />
      <nav
        id="mobile-nav-panel"
        className="fixed top-0 right-0 z-[110] flex h-[100dvh] max-h-[100dvh] w-max min-w-[11.5rem] max-w-[min(15rem,72vw)] flex-col overflow-y-auto border-l border-zinc-800 bg-zinc-950 shadow-2xl"
        style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between gap-6 px-4 pb-3">
          <span className="text-sm font-medium text-white">Меню</span>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-white"
          >
            <span aria-hidden className="text-xl leading-none">
              ×
            </span>
          </button>
        </div>

        <ul className="flex flex-col gap-0.5 px-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={onClose}
                className={`block whitespace-nowrap rounded-lg px-3 py-2.5 text-base font-medium transition ${
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
          className="mt-auto border-t border-zinc-800 px-4 pt-3"
          style={{
            paddingBottom: "max(1.25rem, calc(env(safe-area-inset-bottom) + 0.75rem))",
          }}
        >
          {isLoggedIn ? (
            <>
              <Link
                href="/profile"
                onClick={onClose}
                className="block max-w-[12rem] truncate py-2 text-sm text-zinc-500 hover:text-zinc-300"
              >
                {displayName ?? userEmail}
              </Link>
              <div className="pb-1 pt-1">
                <SignOutButton />
              </div>
            </>
          ) : (
            <Link
              href="/login"
              onClick={onClose}
              className="block rounded-lg bg-white px-4 py-3 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-200"
            >
              Войти
            </Link>
          )}
        </div>
      </nav>
    </>
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
