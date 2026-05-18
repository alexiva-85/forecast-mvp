"use client";

import { useState, useTransition } from "react";
import { grantTestShares } from "@/app/actions/admin";

export function AdminGrantTestShares() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await grantTestShares(formData);
      if (result.error) setMessage(result.error);
      else setMessage(result.success ?? "Готово");
    });
  }

  return (
    <article className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
      <h3 className="font-medium text-amber-200/90">Тестовые доли (sandbox)</h3>
      <p className="mt-1 text-sm text-zinc-500">
        Начисление долей по исходу для проверки продажи и redeem. Только рынки с
        флагом sandbox.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-zinc-500">Email пользователя</span>
          <input
            name="userEmail"
            type="email"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            placeholder="you@example.com"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-zinc-500">Slug рынка</span>
          <input
            name="marketSlug"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            placeholder="my-multi-market"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-zinc-500">
            Исход (ключ: o1, o2, o3 или yes/no)
          </span>
          <input
            name="outcomeKey"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            placeholder="o2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-zinc-500">Количество долей</span>
          <input
            name="shares"
            type="number"
            min={1}
            max={100000}
            step={1}
            defaultValue={100}
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-50"
        >
          {pending ? "Начисляем…" : "Начислить доли"}
        </button>
      </form>
      {message && (
        <p
          className={`mt-3 text-sm ${
            message.startsWith("Начислено") ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {message}
        </p>
      )}
    </article>
  );
}
