import { applyReferralFromCookie } from "@/app/actions/referral";
import { requireAccountUser } from "@/lib/account-auth";
import { ReferralApplyForm } from "@/components/account/ReferralApplyForm";
import { ReferralInvitesList } from "@/components/account/ReferralInvitesList";
import { ReferralShareCard } from "@/components/account/ReferralShareCard";
import { TestMoneyBanner } from "@/components/account/TestMoneyBanner";
import {
  REFERRAL_BONUS_USD,
  type ReferralInviteRow,
  type ReferralSummary,
} from "@/lib/referral";

export default async function PortfolioReferralPage() {
  const { supabase } = await requireAccountUser("/portfolio/referral");
  await applyReferralFromCookie();

  const [{ data: summaryRows, error: summaryError }, { data: inviteRows }] =
    await Promise.all([
      supabase.rpc("get_my_referral_summary"),
      supabase.rpc("list_my_referrals", { p_limit: 20 }),
    ]);

  if (summaryError) {
    throw new Error(summaryError.message);
  }

  const raw = Array.isArray(summaryRows) ? summaryRows[0] : summaryRows;
  const summary: ReferralSummary = {
    referral_code: String(raw?.referral_code ?? ""),
    invited_count: Number(raw?.invited_count ?? 0),
    bonus_earned_usd: Number(raw?.bonus_earned_usd ?? 0),
    can_apply_code: Boolean(raw?.can_apply_code),
    referred_by_label: raw?.referred_by_label
      ? String(raw.referred_by_label)
      : null,
    applied_at: raw?.applied_at ? String(raw.applied_at) : null,
  };

  const invites: ReferralInviteRow[] = (inviteRows ?? []).map(
    (row: {
      referred_user_id: string;
      display_label: string;
      created_at: string;
      bonus_usd: number;
    }) => ({
      referred_user_id: row.referred_user_id,
      display_label: row.display_label,
      created_at: row.created_at,
      bonus_usd: Number(row.bonus_usd),
    }),
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-white">Пригласить</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Поделитесь ссылкой — бонусы на тестовый счёт для вас и друга
        </p>
      </header>

      <TestMoneyBanner variant="general" />

      <section className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Приглашено</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
            {summary.invited_count.toLocaleString("ru-RU")}
          </p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Заработано бонусов</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-400">
            ${summary.bonus_earned_usd.toLocaleString("ru-RU", {
              maximumFractionDigits: 0,
            })}
          </p>
        </article>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-medium text-white">Ваша ссылка</h2>
        <div className="mt-4">
          <ReferralShareCard
            referralCode={summary.referral_code}
            bonusUsd={REFERRAL_BONUS_USD}
          />
        </div>
      </section>

      {summary.referred_by_label ? (
        <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
          Вы зарегистрировались по приглашению от{" "}
          <span className="font-medium">{summary.referred_by_label}</span>
          {summary.applied_at && (
            <>
              {" "}
              ·{" "}
              {new Date(summary.applied_at).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </>
          )}
        </p>
      ) : summary.can_apply_code ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="text-sm font-medium text-white">Есть код?</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Введите код друга в течение 7 дней после регистрации — на счёт
            придёт ${REFERRAL_BONUS_USD} тестовых.
          </p>
          <div className="mt-4">
            <ReferralApplyForm />
          </div>
        </section>
      ) : (
        <p className="text-sm text-zinc-500">
          Срок ввода кода приглашения истёк (7 дней с регистрации).
        </p>
      )}

      <section>
        <h2 className="mb-4 text-sm font-medium text-zinc-400">
          Приглашённые
        </h2>
        <ReferralInvitesList rows={invites} />
      </section>
    </div>
  );
}
