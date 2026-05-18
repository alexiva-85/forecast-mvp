"use client";

import { useState } from "react";

type Props = {
  token: string;
};

export function SentryTestPanel({ token }: Props) {
  const [serverStatus, setServerStatus] = useState<string | null>(null);

  const triggerClientError = () => {
    throw new Error("Forecast Sentry acceptance test (client)");
  };

  const triggerServerError = async () => {
    setServerStatus(null);
    const res = await fetch(
      `/api/sentry-test?token=${encodeURIComponent(token)}`,
    );
    if (res.status === 500) {
      setServerStatus(
        "Запрос вернул 500 — проверьте Sentry Issues (server API).",
      );
      return;
    }
    setServerStatus(`Неожиданный ответ: HTTP ${res.status}`);
  };

  return (
    <div className="mt-8 flex flex-col flex-wrap gap-3 sm:flex-row">
      <button
        type="button"
        onClick={triggerClientError}
        className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500"
      >
        Trigger client error
      </button>
      <button
        type="button"
        onClick={() => void triggerServerError()}
        className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-700"
      >
        Trigger server error (API)
      </button>
      {serverStatus ? (
        <p className="w-full text-sm text-amber-400/90">{serverStatus}</p>
      ) : null}
    </div>
  );
}
