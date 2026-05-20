"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  reportUnexpectedRpcError,
  withSentryServerAction,
} from "@/lib/sentry-server-action";
import type { WithdrawalMethod } from "@/lib/wallet";

const METHODS = new Set<WithdrawalMethod>(["bank", "card", "crypto"]);

export async function submitWithdrawalRequest(input: {
  amount: string;
  method: WithdrawalMethod;
  details: string;
}) {
  return withSentryServerAction("submitWithdrawalRequest", async () => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Войдите в аккаунт" };
    }

    if (!METHODS.has(input.method)) {
      return { error: "Выберите способ вывода" };
    }

    const amount = Number.parseFloat(input.amount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      return { error: "Укажите сумму больше нуля" };
    }

    const { error } = await supabase.rpc("submit_withdrawal_request", {
      p_amount: amount,
      p_method: input.method,
      p_details: input.details.trim() || null,
    });

    if (error) {
      return { error: mapWithdrawalError(error.message) };
    }

    revalidatePath("/portfolio/withdraw");
    revalidatePath("/portfolio");
    return { success: true as const };
  });
}

function mapWithdrawalError(message: string): string {
  if (message.includes("Not authenticated")) {
    return "Войдите в аккаунт";
  }
  if (message.includes("Withdrawal already pending")) {
    return "У вас уже есть заявка на вывод — дождитесь её обработки";
  }
  if (message.includes("Insufficient balance")) {
    return "Сумма больше доступного баланса";
  }
  if (message.includes("Invalid amount") || message.includes("Amount too large")) {
    return "Некорректная сумма";
  }
  if (message.includes("Details too long")) {
    return "Комментарий слишком длинный (макс. 500 символов)";
  }
  if (message.includes("Rate limit exceeded")) {
    return "Слишком много заявок — попробуйте позже";
  }
  reportUnexpectedRpcError("wallet", message);
  return "Не удалось отправить заявку";
}
