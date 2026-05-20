import { UiListRow } from "@/components/UiListRow";
import type { ReferralInviteRow } from "@/lib/referral";

function formatBonus(usd: number): string {
  const sign = usd >= 0 ? "+" : "";
  return `${sign}$${usd.toLocaleString("ru-RU", { maximumFractionDigits: 0 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ReferralInvitesList({ rows }: { rows: ReferralInviteRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-600">
        Пока никто не зарегистрировался по вашей ссылке
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-zinc-900/30">
      {rows.map((row) => (
        <li key={row.referred_user_id} className="px-4 py-3">
          <UiListRow
            actionLine={row.display_label}
            termsLine={formatDate(row.created_at)}
            right={
              <span className="text-sm font-medium tabular-nums text-emerald-400">
                {formatBonus(row.bonus_usd)}
              </span>
            }
          />
        </li>
      ))}
    </ul>
  );
}
