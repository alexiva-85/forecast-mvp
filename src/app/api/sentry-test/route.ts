import { NextRequest, NextResponse } from "next/server";
import { isSentryTestAllowed } from "@/lib/sentry-test-auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!isSentryTestAllowed(token)) {
    return new NextResponse(null, { status: 404 });
  }

  throw new Error("Forecast Sentry acceptance test (server API)");
}
