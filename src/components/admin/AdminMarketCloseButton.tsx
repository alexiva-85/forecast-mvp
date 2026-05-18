"use client";

import { useState, useTransition } from "react";
import { closeMarket } from "@/app/actions/admin";

export function AdminMarketCloseButton({
  slug,
  label = "Закрыть торги",
  confirmMessage = "Закрыть торги? Открытые заявки будут сняты.",
}: {
  slug: string;
  label?: string;
  confirmMessage?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClose() {
    if (!window.confirm(confirmMessage)) return;

    setMessage(null);
    startTransition(async () => {
      const result = await closeMarket(slug);
      if (result.error) setMessage(result.error);
      else setMessage(result.success ?? "Торги закрыты");
    });
  }

  return (
    <section className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={handleClose}
        className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
      >
        {pending ? "Закрываем…" : label}
      </button>
      {message && (
        <p
          className={`max-w-[14rem] text-right text-xs ${
            message.includes("закрыт") ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {message}
        </p>
      )}
    </section>
  );
}
