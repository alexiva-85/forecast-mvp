"use server";

import { revalidatePath } from "next/cache";
import { revalidateAccountPaths } from "@/lib/revalidate-account";
import { createClient } from "@/lib/supabase/server";

export async function updateDisplayName(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!displayName || displayName.length > 64) {
    return { error: "Имя должно быть от 1 до 64 символов" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Войдите в аккаунт" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidateAccountPaths();
  revalidatePath("/", "layout");
  return { success: true as const };
}
