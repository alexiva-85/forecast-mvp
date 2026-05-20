import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { referralCookieOptions } from "@/lib/referral-cookie";
import { isValidReferralCodeFormat, normalizeReferralCode } from "@/lib/referral";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  const ref = request.nextUrl.searchParams.get("ref");
  if (ref && isValidReferralCodeFormat(ref)) {
    response.cookies.set(referralCookieOptions(normalizeReferralCode(ref)));
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
