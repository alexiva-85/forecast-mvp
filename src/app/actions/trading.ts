"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MarketOrderResult = {
  filled: number;
  requested: number;
  avgPrice: number | null;
  timeInForce: string;
};

export async function placeMarketOrder(formData: FormData) {
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
  const size = Number(formData.get("size"));
  const timeInForce = formData.get("timeInForce") as string;

  const { data, error } = await supabase.rpc("place_market_order", {
    p_market_id: marketId,
    p_side: side,
    p_direction: direction,
    p_size: size,
    p_time_in_force: timeInForce,
  });

  if (error) {
    return { error: mapDbError(error.message) };
  }

  const slug = formData.get("slug") as string;
  revalidatePath("/");
  revalidatePath(`/market/${slug}`);
  revalidatePath("/portfolio");

  const row = data as {
    filled: number;
    requested: number;
    avg_price: number | null;
    time_in_force: string;
  };

  return {
    success: true,
    result: {
      filled: Number(row.filled),
      requested: Number(row.requested),
      avgPrice: row.avg_price != null ? Number(row.avg_price) : null,
      timeInForce: row.time_in_force,
    } satisfies MarketOrderResult,
  };
}

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

export async function cancelOrder(orderId: string, slug?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Войдите в аккаунт" };
  }

  const { error } = await supabase.rpc("cancel_order", {
    p_order_id: orderId,
  });

  if (error) {
    return { error: mapDbError(error.message) };
  }

  revalidatePath("/portfolio");
  if (slug) {
    revalidatePath(`/market/${slug}`);
  }
  revalidatePath("/");
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
  if (message.includes("Not your order")) {
    return "Это не ваш ордер";
  }
  if (message.includes("Order is not open")) {
    return "Ордер уже закрыт";
  }
  if (message.includes("Order not found")) {
    return "Ордер не найден";
  }
  if (message.includes("Trading closed")) {
    return "Торги закрыты по расписанию";
  }
  if (message.includes("Rate limit exceeded")) {
    return "Слишком много запросов — подождите минуту";
  }
  if (message.includes("Order size too large")) {
    return "Слишком большой размер ордера (макс. 10 000 долей)";
  }
  if (message.includes("Insufficient liquidity")) {
    return "Недостаточно ликвидности в стакане";
  }
  if (message.includes("Invalid time in force")) {
    return "Неверный тип исполнения (FOK или IOC)";
  }
  return message;
}
