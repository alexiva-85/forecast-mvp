import { cookies } from "next/headers";
import {
  REFERRAL_COOKIE_MAX_AGE,
  REFERRAL_COOKIE_NAME,
  normalizeReferralCode,
} from "@/lib/referral";

export async function getReferralCookieCode(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(REFERRAL_COOKIE_NAME)?.value;
  if (!raw) return null;
  const code = normalizeReferralCode(raw);
  return code.length >= 4 ? code : null;
}

export async function clearReferralCookie(): Promise<void> {
  const store = await cookies();
  store.delete(REFERRAL_COOKIE_NAME);
}

export function referralCookieOptions(code: string) {
  return {
    name: REFERRAL_COOKIE_NAME,
    value: normalizeReferralCode(code),
    maxAge: REFERRAL_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}
