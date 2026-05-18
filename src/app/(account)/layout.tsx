import Link from "next/link";
import { AccountNav } from "@/components/account/AccountNav";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-zinc-900 bg-zinc-950">
      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-7xl flex-col lg:flex-row">
        <aside className="order-1 w-full shrink-0 border-b border-zinc-800 px-4 py-4 lg:order-2 lg:w-56 lg:border-b-0 lg:border-l lg:py-6 lg:pl-6 lg:pr-4">
          <header className="mb-4 hidden px-1 lg:block">
            <Link
              href="/"
              className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
            >
              ← На рынки
            </Link>
            <h2 className="mt-2 text-lg font-semibold text-white">Кабинет</h2>
          </header>
          <p className="mb-3 px-1 text-xs font-medium uppercase tracking-wide text-zinc-600 lg:hidden">
            Кабинет
          </p>
          <AccountNav />
        </aside>
        <article className="order-2 min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8 lg:order-1">
          {children}
        </article>
      </div>
    </section>
  );
}
