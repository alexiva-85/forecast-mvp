"use client";

import {
  checkMarketDraftQuality,
  qualityWarningMeta,
} from "@/lib/admin-quality";

export function AdminWizardQualityHints({
  title,
  closesAt,
  resolutionRules,
}: {
  title: string;
  closesAt: string;
  resolutionRules: string;
}) {
  const warnings = checkMarketDraftQuality({
    title,
    closesAt: closesAt || null,
    resolutionRules,
    status: "open",
  });

  if (warnings.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm">
      <p className="font-medium text-amber-200/90">Проверка качества</p>
      <ul className="mt-2 space-y-1 text-xs">
        {warnings.map((w) => {
          const meta = qualityWarningMeta(w.code);
          return (
            <li key={w.code} className={meta.className}>
              <span className="text-zinc-600">{meta.label}: </span>
              {w.message}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
