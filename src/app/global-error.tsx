"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ru">
      <body className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100 antialiased">
        <h1 className="text-xl font-semibold">Что-то пошло не так</h1>
        <p className="mt-2 max-w-md text-center text-sm text-zinc-400">
          Ошибка зафиксирована в мониторинге. Попробуйте обновить страницу.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-700"
        >
          Повторить
        </button>
      </body>
    </html>
  );
}
