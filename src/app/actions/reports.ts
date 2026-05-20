"use server";

import { createClient } from "@/lib/supabase/server";
import {
  reportUnexpectedRpcError,
  withSentryServerAction,
} from "@/lib/sentry-server-action";
import type { ContentReportReason } from "@/lib/content-reports";

const REASONS = new Set<ContentReportReason>([
  "misleading",
  "offensive",
  "spam",
  "other",
]);

export async function submitMarketReport(input: {
  marketSlug: string;
  reason: ContentReportReason;
  details: string;
}) {
  return withSentryServerAction("submitMarketReport", async () => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Войдите в аккаунт, чтобы отправить жалобу" };
    }

    if (!REASONS.has(input.reason)) {
      return { error: "Выберите причину жалобы" };
    }

    const { error } = await supabase.rpc("submit_content_report", {
      p_subject_type: "market",
      p_subject_slug: input.marketSlug.trim(),
      p_reason: input.reason,
      p_details: input.details.trim() || null,
    });

    if (error) {
      return { error: mapReportError(error.message) };
    }

    return { success: true };
  });
}

function mapReportError(message: string): string {
  if (message.includes("Not authenticated")) {
    return "Войдите в аккаунт";
  }
  if (message.includes("Report already pending")) {
    return "Вы уже отправили жалобу по этому объекту — дождитесь рассмотрения";
  }
  if (message.includes("Market not found")) {
    return "Рынок не найден";
  }
  if (message.includes("Details too long")) {
    return "Комментарий слишком длинный (макс. 2000 символов)";
  }
  if (message.includes("Rate limit exceeded")) {
    return "Слишком много жалоб — попробуйте позже";
  }
  reportUnexpectedRpcError("reports", message);
  return "Не удалось отправить жалобу";
}
