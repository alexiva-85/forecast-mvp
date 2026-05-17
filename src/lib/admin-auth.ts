import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminGate =
  | { isAdmin: true; userId: string }
  | { isAdmin: false; userId: string | null }
  | { redirect: string };

export async function getAdminGate(nextPath = "/admin"): Promise<AdminGate> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { redirect: `/login?next=${encodeURIComponent(nextPath)}` };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { isAdmin: false, userId: user.id };
  }

  return { isAdmin: true, userId: user.id };
}

export async function requireAdmin(nextPath = "/admin") {
  const gate = await getAdminGate(nextPath);
  if ("redirect" in gate) redirect(gate.redirect);
  return gate;
}
