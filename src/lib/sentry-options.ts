import type { BrowserOptions, EdgeOptions, NodeOptions } from "@sentry/nextjs";
import {
  sentryBeforeSend,
  sentryClientDenyUrls,
} from "@/lib/sentry-filters";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

export const sentryEnabled = Boolean(dsn);

function getEnvironment(): string {
  return process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";
}

function getTracesSampleRate(): number {
  const env = getEnvironment();
  if (env === "development") return 1;
  if (env === "preview") return 0.2;
  return 0.1;
}

const shared = {
  dsn,
  enabled: sentryEnabled,
  environment: getEnvironment(),
  tracesSampleRate: getTracesSampleRate(),
};

export function getServerSentryOptions(): NodeOptions {
  return { ...shared };
}

export function getEdgeSentryOptions(): EdgeOptions {
  return { ...shared };
}

export function getClientSentryOptions(): BrowserOptions {
  return {
    ...shared,
    denyUrls: sentryClientDenyUrls,
    beforeSend: sentryBeforeSend,
  };
}
