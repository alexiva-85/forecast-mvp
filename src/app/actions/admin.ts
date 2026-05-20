"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  reportUnexpectedRpcError,
  withSentryServerAction,
} from "@/lib/sentry-server-action";
import type { MarketCategory } from "@/lib/types";
import type { KycStatus } from "@/lib/admin-users";

export async function createMarket(formData: FormData) {
  return withSentryServerAction("createMarket", async () => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Войдите в аккаунт" };
    }

    const slug = (formData.get("slug") as string).trim().toLowerCase();
    const title = (formData.get("title") as string).trim();
    const description = (formData.get("description") as string).trim();
    const category = formData.get("category") as MarketCategory;
    const closesAtRaw = (formData.get("closesAt") as string).trim();
    const resolutionRules = (formData.get("resolutionRules") as string).trim();
    const checklistRaw = (formData.get("resolutionChecklist") as string).trim();
    const tagsRaw = (formData.get("tags") as string).trim();

    const checklist = checklistRaw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const tags = tagsRaw
      .split(/[,;\n]/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    if (!slug || !title || !resolutionRules || checklist.length === 0) {
      return { error: "Заполните обязательные поля" };
    }

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      return { error: "Slug: только латиница, цифры и дефисы" };
    }

    const closesAt = closesAtRaw
      ? new Date(closesAtRaw).toISOString()
      : null;

  const isSandbox = formData.get("isSandbox") === "true";

  const isMultiOutcome = formData.get("isMultiOutcome") === "true";
  const outcomesRaw = (formData.get("outcomesJson") as string | null)?.trim();
  let p_outcomes: { key: string; label: string }[] | null = null;

  if (isMultiOutcome) {
    if (!outcomesRaw) {
      return { error: "Укажите исходы (по одному на строку)" };
    }
    try {
      const parsed = JSON.parse(outcomesRaw) as { key: string; label: string }[];
      if (!Array.isArray(parsed) || parsed.length < 3 || parsed.length > 8) {
        return { error: "Мульти-исход: от 3 до 8 вариантов" };
      }
      p_outcomes = parsed;
    } catch {
      return { error: "Некорректный формат исходов" };
    }
  }

  const { data, error } = await supabase.rpc("admin_create_market", {
    p_slug: slug,
    p_title: title,
    p_description: description || null,
    p_category: category,
    p_closes_at: closesAt,
    p_resolution_rules: resolutionRules,
    p_resolution_checklist: checklist,
    p_tags: tags,
    p_is_sandbox: isSandbox,
    p_outcomes: p_outcomes,
  });

    if (error) {
      return { error: mapAdminError(error.message) };
    }

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath(`/market/${slug}`);
    return { success: true, marketId: data as string, slug };
  });
}

export async function updateMarket(formData: FormData) {
  return withSentryServerAction("updateMarket", async () => {
    const marketSlug = (formData.get("marketSlug") as string).trim().toLowerCase();
    const title = (formData.get("title") as string).trim();
    const description = (formData.get("description") as string).trim();
    const category = formData.get("category") as MarketCategory;
    const closesAtRaw = (formData.get("closesAt") as string).trim();
    const resolutionRules = (formData.get("resolutionRules") as string).trim();
    const checklistRaw = (formData.get("resolutionChecklist") as string).trim();
    const tagsRaw = (formData.get("tags") as string).trim();
    const newSlugRaw = (formData.get("newSlug") as string | null)?.trim().toLowerCase();

    const checklist = checklistRaw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const tags = tagsRaw
      .split(/[,;\n]/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    if (!marketSlug || !title || !resolutionRules || checklist.length === 0) {
      return { error: "Заполните обязательные поля" };
    }

    if (newSlugRaw && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(newSlugRaw)) {
      return { error: "Slug: только латиница, цифры и дефисы" };
    }

    const closesAt = closesAtRaw
      ? new Date(closesAtRaw).toISOString()
      : null;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_update_market", {
      p_market_slug: marketSlug,
      p_title: title,
      p_description: description || null,
      p_category: category,
      p_closes_at: closesAt,
      p_resolution_rules: resolutionRules,
      p_resolution_checklist: checklist,
      p_tags: tags,
      p_new_slug: newSlugRaw && newSlugRaw !== marketSlug ? newSlugRaw : null,
    });

    if (error) {
      return { error: mapAdminError(error.message) };
    }

    const slug = (data as string) ?? marketSlug;

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/markets");
    revalidatePath("/admin/audit");
    revalidatePath(`/market/${slug}`);
    if (slug !== marketSlug) {
      revalidatePath(`/market/${marketSlug}`);
      revalidatePath(`/admin/markets/${marketSlug}/edit`);
    }
    revalidatePath(`/admin/markets/${slug}/edit`);
    return { success: true, slug };
  });
}

export async function adminResolveMarket(
  marketId: string,
  outcomeKey: string,
  slug: string,
  options?: { comment?: string; proofUrl?: string },
) {
  return withSentryServerAction("adminResolveMarket", async () => {
    const comment = options?.comment?.trim() ?? "";
    const proofUrl = options?.proofUrl?.trim() ?? "";

    if (proofUrl && !/^https?:\/\//i.test(proofUrl)) {
      return { error: "Ссылка должна начинаться с http:// или https://" };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_resolve_market", {
      p_market_id: marketId,
      p_side: outcomeKey,
      p_comment: comment || null,
      p_proof_url: proofUrl || null,
    });

    if (error) {
      return { error: mapAdminError(error.message) };
    }

    revalidatePath("/");
    revalidatePath(`/market/${slug}`);
    revalidatePath("/admin");
    return { success: true };
  });
}

export async function grantTestShares(formData: FormData) {
  return withSentryServerAction("grantTestShares", async () => {
    const supabase = await createClient();
    const userEmail = (formData.get("userEmail") as string).trim();
    const marketSlug = (formData.get("marketSlug") as string).trim().toLowerCase();
    const outcomeKey = (formData.get("outcomeKey") as string).trim().toLowerCase();
    const shares = Number(formData.get("shares"));

    if (!userEmail || !marketSlug || !outcomeKey) {
      return { error: "Заполните все поля" };
    }

    if (!Number.isFinite(shares) || shares <= 0) {
      return { error: "Укажите количество долей" };
    }

    const { error } = await supabase.rpc("admin_grant_test_shares", {
      p_user_email: userEmail,
      p_market_slug: marketSlug,
      p_outcome_key: outcomeKey,
      p_shares: shares,
    });

    if (error) {
      return { error: mapAdminError(error.message) };
    }

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/markets");
    const { revalidateAccountPaths } = await import("@/lib/revalidate-account");
    revalidateAccountPaths();
    revalidatePath(`/market/${marketSlug}`);
    return {
      success: `Начислено ${shares} долей «${outcomeKey}». Рынок скрыт из каталога (тестовый) — опубликуйте во вкладке «Тестовые» в /admin/markets`,
    };
  });
}

export async function closeMarket(marketSlug: string) {
  return withSentryServerAction("closeMarket", async () => {
    const slug = marketSlug.trim().toLowerCase();
    if (!slug) {
      return { error: "Укажите slug рынка" };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_close_market", {
      p_market_slug: slug,
    });

    if (error) {
      return { error: mapAdminError(error.message) };
    }

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/markets");
    revalidatePath("/admin/resolve");
    revalidatePath(`/market/${slug}`);
    revalidatePath(`/admin/resolve/${slug}`);
    const { revalidateAccountPaths } = await import("@/lib/revalidate-account");
    revalidateAccountPaths();
    return {
      success: "Торги закрыты — можно фиксировать исход",
    };
  });
}

export async function publishDraftMarket(marketSlug: string) {
  return withSentryServerAction("publishDraftMarket", async () => {
    const slug = marketSlug.trim().toLowerCase();
    if (!slug) {
      return { error: "Укажите slug рынка" };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_publish_draft_market", {
      p_market_slug: slug,
    });

    if (error) {
      return { error: mapAdminError(error.message) };
    }

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/markets");
    revalidatePath(`/market/${slug}`);
    return {
      success: "Рынок опубликован — появился в каталоге",
    };
  });
}

export async function publishMarket(marketSlug: string) {
  return withSentryServerAction("publishMarket", async () => {
    const slug = marketSlug.trim().toLowerCase();
    if (!slug) {
      return { error: "Укажите slug рынка" };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_publish_market", {
      p_market_slug: slug,
    });

    if (error) {
      return { error: mapAdminError(error.message) };
    }

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/markets");
    revalidatePath(`/market/${slug}`);
    return {
      success: "Рынок в публичном каталоге на главной",
    };
  });
}

export async function updateUserModeration(input: {
  userId: string;
  tradingBlocked: boolean;
  kycStatus: KycStatus;
  moderationNote: string;
  rateLimitMultiplier: number;
}) {
  return withSentryServerAction("updateUserModeration", async () => {
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_update_user", {
      p_user_id: input.userId,
      p_trading_blocked: input.tradingBlocked,
      p_kyc_status: input.kycStatus,
      p_moderation_note: input.moderationNote.trim() || null,
      p_rate_limit_multiplier: input.rateLimitMultiplier,
    });

    if (error) {
      return { error: mapAdminError(error.message) };
    }

    revalidatePath("/admin/users");
    revalidatePath("/admin/audit");
    return { success: true };
  });
}

export async function setTradeFeeRate(ratePercent: number) {
  return withSentryServerAction("setTradeFeeRate", async () => {
    const supabase = await createClient();
    const rate = ratePercent / 100;

    if (!Number.isFinite(rate) || rate < 0 || rate > 5) {
      return { error: "Ставка от 0% до 5%" };
    }

    const { error } = await supabase.rpc("admin_set_trade_fee_rate", {
      p_rate: rate,
    });

    if (error) {
      return { error: mapAdminError(error.message) };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/audit");
    return { success: true };
  });
}

export async function updateContentReport(input: {
  reportId: string;
  status: "reviewed" | "dismissed" | "action_taken";
  adminNote: string;
}) {
  return withSentryServerAction("updateContentReport", async () => {
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_update_content_report", {
      p_report_id: input.reportId,
      p_status: input.status,
      p_admin_note: input.adminNote.trim() || null,
    });

    if (error) {
      return { error: mapAdminError(error.message) };
    }

    revalidatePath("/admin/reports");
    revalidatePath("/admin/audit");
    return { success: true };
  });
}

function mapAdminError(message: string): string {
  if (message.includes("Admin only")) {
    return "Только для администратора";
  }
  if (message.includes("Invalid slug")) {
    return "Некорректный slug";
  }
  if (message.includes("Title required")) {
    return "Укажите название рынка";
  }
  if (message.includes("Resolution rules required")) {
    return "Укажите правила резолва";
  }
  if (message.includes("Resolution checklist required")) {
    return "Добавьте хотя бы один пункт чеклиста";
  }
  if (message.includes("duplicate key") || message.includes("markets_slug_key")) {
    return "Рынок с таким slug уже есть. Откройте /admin/markets?tab=sandbox или перейдите на /market/<slug>";
  }
  if (message.includes("Too many tags")) {
    return "Не более 8 тегов";
  }
  if (message.includes("Market must be closed")) {
    return "Сначала закройте торги — резолв только для закрытых рынков";
  }
  if (message.includes("Market is not open")) {
    return "Закрыть торги можно только для открытого рынка";
  }
  if (message.includes("Resolve comment too long")) {
    return "Комментарий слишком длинный (макс. 2000 символов)";
  }
  if (message.includes("Proof URL too long")) {
    return "Ссылка слишком длинная";
  }
  if (message.includes("Proof URL must start")) {
    return "Ссылка должна начинаться с http:// или https://";
  }
  if (message.includes("Market not found")) {
    return "Рынок не найден";
  }
  if (message.includes("Market is not draft")) {
    return "Опубликовать можно только черновик";
  }
  if (message.includes("Cannot edit resolved market")) {
    return "Завершённый рынок нельзя редактировать";
  }
  if (message.includes("Slug cannot be changed after publish")) {
    return "Slug нельзя менять после публикации";
  }
  if (message.includes("Invalid outcome")) {
    return "Некорректный исход";
  }
  if (message.includes("Outcomes count must be")) {
    return "От 2 до 8 исходов";
  }
  if (message.includes("Invalid outcome key")) {
    return "Ключ исхода: латиница, цифры и дефисы";
  }
  if (message.includes("User not found")) {
    return "Пользователь не найден";
  }
  if (message.includes("Trading suspended")) {
    return "Торги заблокированы оператором";
  }
  if (message.includes("Invalid KYC status")) {
    return "Некорректный статус KYC";
  }
  if (message.includes("Invalid rate limit multiplier")) {
    return "Множитель лимита: от 0.01 до 10";
  }
  if (message.includes("Invalid share amount")) {
    return "Некорректное количество долей";
  }
  if (message.includes("Report not found")) {
    return "Жалоба не найдена";
  }
  if (message.includes("Report already processed")) {
    return "Жалоба уже обработана";
  }
  reportUnexpectedRpcError("admin", message);
  return message;
}
