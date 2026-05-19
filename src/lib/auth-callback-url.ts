import { safeAuthRedirect } from "@/lib/auth-redirect";

/** URL для OAuth и magic link (PKCE → /auth/callback). */
export function buildAuthCallbackUrl(
  origin: string,
  nextPath?: string | null,
): string {
  const next = safeAuthRedirect(nextPath);
  const url = new URL("/auth/callback", origin);
  if (next !== "/") {
    url.searchParams.set("next", next);
  }
  return url.toString();
}
