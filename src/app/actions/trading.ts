"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function placeOrder(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Войдите в аккаунт" };
  }

  const marketId = formData.get("marketId") as string;
  const side = formData.get("side") as string;
  const direction = formData.get("direction") as string;
  const price = Number(formData.get("price"));
  const size = Number(formData.get("size"));

  const { error } = await supabase.rpc("place_order", {
    p_market_id: marketId,
    p_side: side,
    p_direction: direction,
    p_price: price,
    p_size: size,
  });

  if (error) {
    return { error: mapDbError(error.message) };
  }

  const slug = formData.get("slug") as string;
  revalidatePath("/");
  revalidatePath(`/market/${slug}`);
  return { success: true };
}

export async function redeemPositions(marketId: string, slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_positions", {
    p_market_id: marketId,
  });

  if (error) {
    return { error: mapDbError(error.message) };
  }

  revalidatePath("/");
  revalidatePath(`/market/${slug}`);
  revalidatePath("/portfolio");
  return { success: true, payout: data as number };
}

export async function adminResolveMarket(
  marketId: string,
  side: "yes" | "no",
  slug: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_resolve_market", {
    p_market_id: marketId,
    p_side: side,
  });

  if (error) {
    return { error: mapDbError(error.message) };
  }

  revalidatePath("/");
  revalidatePath(`/market/${slug}`);
  revalidatePath("/admin");
  return { success: true };
}

function mapDbError(message: string): string {
  if (message.includes("Insufficient balance")) {
    return "Недостаточно тестовых средств";
  }
  if (message.includes("Insufficient shares")) {
    return "Недостаточно долей для продажи";
  }
  if (message.includes("Admin only")) {
    return "Только для администратора";
  }
  if (message.includes("Not authenticated")) {
    return "Войдите в аккаунт";
  }
  return message;
}
