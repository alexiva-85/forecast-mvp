import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";
import { sentryEnabled } from "@/lib/sentry-options";

export async function withSentryServerAction<T>(
  actionName: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!sentryEnabled) {
    return fn();
  }

  return Sentry.withServerActionInstrumentation(
    actionName,
    {
      headers: await headers(),
      recordResponse: true,
    },
    fn,
  );
}

export function reportUnexpectedRpcError(context: string, message: string): void {
  if (!sentryEnabled) return;

  Sentry.captureMessage(`${context}: ${message}`, {
    level: "warning",
    tags: { source: "supabase_rpc" },
  });
}
