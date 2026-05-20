"use client";

import { useState, useTransition } from "react";
import { publishDraftMarket } from "@/app/actions/admin";

export function AdminMarketDraftPublishButton({ slug }: { slug: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handlePublish() {
    setMessage(null);
    startTransition(async () => {
      const result = await publishDraftMarket(slug);
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
        className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
      >
        {pending ? "Публикуем…" : "Опубликовать"}
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
