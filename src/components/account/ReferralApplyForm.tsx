"use client";

import { useState, useTransition } from "react";
import { applyReferralCode } from "@/app/actions/referral";

export function ReferralApplyForm() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await applyReferralCode(code);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setCode("");
    });
  }

  if (success) {
    return (
      <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
        Код применён — бонус зачислен на счёт.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-sm text-zinc-400">
        Код приглашения
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Например, A1B2C3D4"
          autoComplete="off"
          spellCheck={false}
          maxLength={16}
          className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm uppercase tracking-wider text-white placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none"
        />
      </label>
      {error && (
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || code.trim().length < 4}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "Применяем…" : "Применить код"}
      </button>
    </form>
  );
}
