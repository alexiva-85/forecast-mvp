import * as Sentry from "@sentry/nextjs";
import { getEdgeSentryOptions } from "@/lib/sentry-options";

Sentry.init(getEdgeSentryOptions());
