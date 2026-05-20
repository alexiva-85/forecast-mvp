"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  clearReferralCookie,
  getReferralCookieCode,
} from "@/lib/referral-cookie";
import {
  isValidReferralCodeFormat,
  mapApplyReferralError,
  normalizeReferralCode,
} from "@/lib/referral";
import {
  reportUnexpectedRpcError,
  withSentryServerAction,
} from "@/lib/sentry-server-action";

export async function applyReferralCode(rawCode: string) {
  return withSentryServerAction("applyReferralCode", async () => {
    const code = normalizeReferralCode(rawCode);
    if (!isValidReferralCodeFormat(code)) {
      return { error: "Введите код из 4–16 символов" };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Войдите в аккаунт" };
    }

    const { error } = await supabase.rpc("apply_referral_code", {
      p_code: code,
    });

    if (error) {
      reportUnexpectedRpcError("apply_referral_code", error.message);
      return { error: mapApplyReferralError(error.message) };
    }

    await clearReferralCookie();
    revalidateReferralPaths();
    return { success: true as const };
  });
}

export async function applyReferralFromCookie() {
  return withSentryServerAction("applyReferralFromCookie", async () => {
    const code = await getReferralCookieCode();
    if (!code) {
      return { skipped: true as const };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { skipped: true as const };
    }

    const { data: summary, error: summaryError } = await supabase.rpc(
      "get_my_referral_summary",
    );

    if (summaryError) {
      reportUnexpectedRpcError("get_my_referral_summary", summaryError.message);
      return { skipped: true as const };
    }

    const row = Array.isArray(summary) ? summary[0] : summary;
    if (!row?.can_apply_code) {
      await clearReferralCookie();
      return { skipped: true as const };
    }

    const { error } = await supabase.rpc("apply_referral_code", {
      p_code: code,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes("already applied") ||
        msg.includes("window expired") ||
        msg.includes("own referral") ||
        msg.includes("not found")
      ) {
        await clearReferralCookie();
      }
      if (!msg.includes("already applied") && !msg.includes("window expired")) {
        reportUnexpectedRpcError("apply_referral_code", error.message);
      }
      return { skipped: true as const, error: mapApplyReferralError(error.message) };
    }

    await clearReferralCookie();
    revalidateReferralPaths();
    return { success: true as const };
  });
}

function revalidateReferralPaths() {
  revalidatePath("/portfolio/referral");
  revalidatePath("/portfolio");
  revalidatePath("/portfolio/activity");
  revalidatePath("/profile");
}
