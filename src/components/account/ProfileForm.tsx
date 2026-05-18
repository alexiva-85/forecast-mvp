"use client";

import { useState, useTransition } from "react";
import { updateDisplayName } from "@/app/actions/profile";

export function ProfileForm({
  initialDisplayName,
}: {
  initialDisplayName: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateDisplayName(formData);
      if (result.error) {
        setMessage(result.error);
      } else {
        setMessage("Имя сохранено");
      }
    });
  }

  return (
    <form action={handleSubmit} className="mt-4 space-y-3">
      <label className="block text-sm text-zinc-400">
        Отображаемое имя
        <input
          name="display_name"
          type="text"
          defaultValue={initialDisplayName}
          maxLength={64}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-emerald-500/50"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "Сохранение…" : "Сохранить"}
      </button>
      {message && (
        <p
          className={`text-sm ${message.includes("сохранено") ? "text-emerald-400" : "text-rose-400"}`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
