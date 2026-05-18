import * as Sentry from "@sentry/nextjs";
import { getServerSentryOptions } from "@/lib/sentry-options";

Sentry.init(getServerSentryOptions());
