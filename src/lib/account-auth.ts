import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAccountUser(loginNext = "/portfolio") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(loginNext)}`);
  }

  return { supabase, user };
}
