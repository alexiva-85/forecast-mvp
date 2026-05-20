"use client";

import { useState } from "react";
import { buildReferralLink } from "@/lib/referral";

export function ReferralShareCard({
  referralCode,
  bonusUsd,
}: {
  referralCode: string;
  bonusUsd: number;
}) {
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  const link =
    typeof window !== "undefined"
      ? buildReferralLink(window.location.origin, referralCode)
      : `/?ref=${referralCode}`;

  async function copy(text: string, kind: "link" | "code") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-zinc-500">Ваш код</p>
        <p className="mt-1 font-mono text-2xl font-semibold tracking-widest text-emerald-400">
          {referralCode}
        </p>
      </div>
      <p className="text-sm text-zinc-400">
        Друг получит ${bonusUsd.toLocaleString("ru-RU")} тестовых на счёт после
        регистрации; вы — столько же, когда он введёт код (в течение 7 дней).
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copy(link, "link")}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 transition-colors hover:border-zinc-600 hover:text-white"
        >
          {copied === "link" ? "Ссылка скопирована" : "Копировать ссылку"}
        </button>
        <button
          type="button"
          onClick={() => copy(referralCode, "code")}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 transition-colors hover:border-zinc-600 hover:text-white"
        >
          {copied === "code" ? "Код скопирован" : "Копировать код"}
        </button>
      </div>
      <p className="break-all text-xs text-zinc-600">{link}</p>
    </div>
  );
}
