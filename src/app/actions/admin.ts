"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  reportUnexpectedRpcError,
  withSentryServerAction,
} from "@/lib/sentry-server-action";
import type { MarketCategory } from "@/lib/types";

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

  const outcomesRaw = (formData.get("outcomesJson") as string | null)?.trim();
  let p_outcomes: { key: string; label: string }[] | null = null;
  if (outcomesRaw) {
    try {
      const parsed = JSON.parse(outcomesRaw) as { key: string; label: string }[];
      if (!Array.isArray(parsed) || parsed.length < 2) {
        return { error: "Укажите минимум 2 исхода" };
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

export async function adminResolveMarket(
  marketId: string,
  outcomeKey: string,
  slug: string,
) {
  return withSentryServerAction("adminResolveMarket", async () => {
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_resolve_market", {
      p_market_id: marketId,
      p_side: outcomeKey,
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
    return "Рынок с таким slug уже существует";
  }
  if (message.includes("Too many tags")) {
    return "Не более 8 тегов";
  }
  if (message.includes("Market must be closed")) {
    return "Сначала закройте торги — резолв только для закрытых рынков";
  }
  if (message.includes("Market not found")) {
    return "Рынок не найден";
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
  reportUnexpectedRpcError("admin", message);
  return message;
}
