export const REFERRAL_COOKIE_NAME = "forecast_ref";
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
export const REFERRAL_BONUS_USD = 500;
export const REFERRAL_APPLY_WINDOW_DAYS = 7;

export type ReferralSummary = {
  referral_code: string;
  invited_count: number;
  bonus_earned_usd: number;
  can_apply_code: boolean;
  referred_by_label: string | null;
  applied_at: string | null;
};

export type ReferralInviteRow = {
  referred_user_id: string;
  display_label: string;
  created_at: string;
  bonus_usd: number;
};

export function normalizeReferralCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidReferralCodeFormat(code: string): boolean {
  const normalized = normalizeReferralCode(code);
  return normalized.length >= 4 && normalized.length <= 16;
}

export function buildReferralLink(origin: string, code: string): string {
  const url = new URL("/", origin);
  url.searchParams.set("ref", normalizeReferralCode(code));
  return url.toString();
}

export function mapApplyReferralError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("not authenticated")) {
    return "Войдите в аккаунт";
  }
  if (lower.includes("already applied")) {
    return "Код уже был применён";
  }
  if (lower.includes("window expired")) {
    return `Код можно ввести в течение ${REFERRAL_APPLY_WINDOW_DAYS} дней после регистрации`;
  }
  if (lower.includes("not found")) {
    return "Код не найден — проверьте написание";
  }
  if (lower.includes("own referral")) {
    return "Нельзя использовать свой код";
  }
  if (lower.includes("invalid referral")) {
    return "Некорректный код";
  }
  if (lower.includes("rate limit")) {
    return "Слишком много попыток — попробуйте позже";
  }
  return "Не удалось применить код";
}
