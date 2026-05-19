import { requireAccountUser } from "@/lib/account-auth";
import { fetchAccountProfile } from "@/lib/account-data";
import { AccountBalanceCard } from "@/components/account/AccountBalanceCard";
import { ProfileForm } from "@/components/account/ProfileForm";
import { SignOutButton } from "@/components/SignOutButton";
import {
  kycStatusLabel,
  type KycStatus,
} from "@/lib/admin-users";

export default async function ProfilePage() {
  const { supabase, user } = await requireAccountUser("/profile");
  const profile = await fetchAccountProfile(supabase, user.id);
  const displayName = profile.display_name ?? user.email?.split("@")[0] ?? "";
  const kycStatus = (profile.kyc_status ?? "none") as KycStatus;
  const tradingBlocked = Boolean(profile.trading_blocked);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-white">Профиль</h1>
        <p className="mt-1 text-sm text-zinc-500">Аккаунт и настройки</p>
      </header>

      {tradingBlocked && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          Торги на аккаунте приостановлены. Новые заявки недоступны — обратитесь в
          поддержку.
        </p>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <p className="text-sm text-zinc-500">Email</p>
        <p className="mt-1 text-white">{user.email}</p>
        <ProfileForm initialDisplayName={displayName} />
        <p className="mt-4 text-sm text-zinc-500">
          Верификация:{" "}
          <span className="text-zinc-300">{kycStatusLabel(kycStatus)}</span>
        </p>
      </section>

      <AccountBalanceCard balance={Number(profile.balance)} />

      <div className="pt-2">
        <SignOutButton />
      </div>
    </div>
  );
}
