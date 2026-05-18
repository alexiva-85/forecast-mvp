import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { isSentryTestAllowed } from "@/lib/sentry-test-auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!isSentryTestAllowed(token)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const err = new Error("Forecast Sentry acceptance test (server API)");
  Sentry.captureException(err);

  return NextResponse.json(
    { ok: false, message: err.message, sentry: "captured" },
    { status: 500 },
  );
}
