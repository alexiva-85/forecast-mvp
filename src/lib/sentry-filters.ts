import type { ErrorEvent, EventHint } from "@sentry/nextjs";

/** Скрипты расширений браузера (кошельки и т.п.), не наш код. */
const EXTENSION_SCRIPT_PATTERN =
  /extensionPageScript|inpage\.js|chrome-extension:|moz-extension:|safari-extension:/i;

const EXTENSION_DENY_URLS: Array<string | RegExp> = [
  /extensions\//i,
  /^chrome-extension:\/\//i,
  /^moz-extension:\/\//i,
  /^safari-extension:\/\//i,
  /inpage\.js/i,
  /extensionPageScript\.js/i,
];

/**
 * Шум от Wallet Standard / Solana inject (Phantom и др.) на любой странице.
 * Пример: TypeError: r is not a function на wallet-standard:app-ready.
 */
function hasWalletStandardEventArg(args: unknown): boolean {
  if (!Array.isArray(args)) return false;
  return args.some(
    (a) =>
      a &&
      typeof a === "object" &&
      "type" in a &&
      String((a as { type: string }).type).startsWith("wallet-standard:"),
  );
}

export function isBrowserExtensionError(
  event: ErrorEvent,
  hint?: EventHint,
): boolean {
  const frames = event.exception?.values?.[0]?.stacktrace?.frames ?? [];
  if (frames.some((f) => EXTENSION_SCRIPT_PATTERN.test(f.filename ?? ""))) {
    return true;
  }

  const eventArgs = event.extra?.arguments;
  if (hasWalletStandardEventArg(eventArgs)) {
    return true;
  }

  const mechanism = event.exception?.values?.[0]?.mechanism;
  if (
    mechanism?.type === "auto.browser.browserapierrors.addEventListener" &&
    mechanism?.handled === false &&
    hasWalletStandardEventArg(
      (hint as EventHint & { captureContext?: { extra?: unknown } })
        ?.captureContext?.extra,
    )
  ) {
    return true;
  }

  return false;
}

export function sentryBeforeSend(
  event: ErrorEvent,
  hint: EventHint,
): ErrorEvent | null {
  if (isBrowserExtensionError(event, hint)) {
    return null;
  }
  return event;
}

export const sentryClientDenyUrls = EXTENSION_DENY_URLS;
