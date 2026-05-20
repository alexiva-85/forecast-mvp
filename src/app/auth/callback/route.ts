import { NextResponse } from "next/server";
import { applyReferralFromCookie } from "@/app/actions/referral";
import { createClient } from "@/lib/supabase/server";
import { safeAuthRedirect } from "@/lib/auth-redirect";
import { mapAuthCallbackError } from "@/lib/auth-errors";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const oauthError = searchParams.get("error");
  const oauthDescription = searchParams.get("error_description");

  if (oauthError) {
    const message = mapAuthCallbackError(oauthError, oauthDescription);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(message)}`,
    );
  }

  const code = searchParams.get("code");
  const next = safeAuthRedirect(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await applyReferralFromCookie();
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
