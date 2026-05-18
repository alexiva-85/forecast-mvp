import { describe, it, expect } from "vitest";
import {
  isBrowserExtensionError,
  sentryBeforeSend,
} from "@/lib/sentry-filters";
import type { ErrorEvent } from "@sentry/nextjs";

describe("sentry-filters", () => {
  it("drops errors from browser extension scripts", () => {
    const event: ErrorEvent = {
      exception: {
        values: [
          {
            type: "TypeError",
            value: "r is not a function",
            stacktrace: {
              frames: [
                {
                  filename: "app:///scripts/lib/inpage.js",
                  lineno: 656,
                },
                {
                  filename: "app:///extensionPageScript.js",
                  lineno: 5739,
                },
              ],
            },
            mechanism: {
              type: "auto.browser.browserapierrors.addEventListener",
              handled: false,
            },
          },
        ],
      },
    };

    expect(isBrowserExtensionError(event)).toBe(true);
    expect(sentryBeforeSend(event, {})).toBeNull();
  });

  it("drops wallet-standard listener noise from event extra", () => {
    const event: ErrorEvent = {
      exception: {
        values: [
          {
            type: "TypeError",
            value: "r is not a function",
            mechanism: {
              type: "auto.browser.browserapierrors.addEventListener",
              handled: false,
            },
          },
        ],
      },
      extra: {
        arguments: [
          {
            type: "wallet-standard:app-ready",
            target: {},
          },
        ],
      },
    };

    expect(isBrowserExtensionError(event)).toBe(true);
    expect(sentryBeforeSend(event, {})).toBeNull();
  });

  it("keeps application errors", () => {
    const event: ErrorEvent = {
      exception: {
        values: [
          {
            type: "Error",
            value: "Forecast test",
            stacktrace: {
              frames: [
                {
                  filename: "webpack-internal:///./src/components/TradePanel.tsx",
                  lineno: 10,
                },
              ],
            },
          },
        ],
      },
    };

    expect(isBrowserExtensionError(event)).toBe(false);
    expect(sentryBeforeSend(event, {})).toBe(event);
  });
});
