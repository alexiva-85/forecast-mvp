import { timingSafeEqual } from "node:crypto";

export function isSentryTestAllowed(token: string | null | undefined): boolean {
  const secret = process.env.SENTRY_TEST_TOKEN;
  if (!secret || !token) {
    return false;
  }

  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}
