"use client";

import { useState, useTransition } from "react";
import { publishMarket } from "@/app/actions/admin";

export function AdminMarketPublishButton({ slug }: { slug: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handlePublish() {
    setMessage(null);
    startTransition(async () => {
      const result = await publishMarket(slug);
      if (result.error) setMessage(result.error);
      else setMessage(result.success ?? "Опубликован");
    });
  }

  return (
    <section className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={handlePublish}
        className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
      >
        {pending ? "Публикуем…" : "В каталог"}
      </button>
      {message && (
        <p
          className={`max-w-[14rem] text-right text-xs ${
            message.includes("каталоге") ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {message}
        </p>
      )}
    </section>
  );
}
