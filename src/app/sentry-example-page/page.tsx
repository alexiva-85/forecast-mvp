import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isSentryTestAllowed } from "@/lib/sentry-test-auth";
import { SentryTestPanel } from "./SentryTestPanel";

export const metadata: Metadata = {
  title: "Sentry acceptance test",
  robots: { index: false, follow: false },
};

export default async function SentryExamplePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!isSentryTestAllowed(token)) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-xl font-semibold text-white">Sentry — приёмка</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Контролируемые ошибки для проверки Issues в production. Не влияет на
        балансы, ордера и рынки.
      </p>
      <p className="mt-4 text-xs text-zinc-500">
        Прямой API:{" "}
        <code className="text-zinc-400">GET /api/sentry-test?token=…</code>
      </p>
      <SentryTestPanel token={token!} />
    </div>
  );
}
