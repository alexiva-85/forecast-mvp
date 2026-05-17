import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";
import { getTestEnv } from "./env";

const clientOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws as unknown as typeof WebSocket },
};

export function createServiceClient(): SupabaseClient {
  const { url, serviceRoleKey } = getTestEnv();
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required for integration tests");
  }
  return createClient(url, serviceRoleKey, clientOptions);
}

export function createAnonClient(): SupabaseClient {
  const { url, anonKey } = getTestEnv();
  if (!url || !anonKey) throw new Error("Missing Supabase anon env");
  return createClient(url, anonKey, clientOptions);
}

export async function createUserClient(
  email: string,
  password: string,
): Promise<SupabaseClient> {
  const admin = createServiceClient();
  const anon = createAnonClient();

  const existing = (await admin.auth.admin.listUsers()).data.users.find(
    (u) => u.email === email,
  );
  if (existing) {
    await admin.auth.admin.deleteUser(existing.id);
  }

  await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw error ?? new Error("Sign in failed");
  }

  const { url, anonKey } = getTestEnv();
  return createClient(url!, anonKey!, {
    ...clientOptions,
    global: {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    },
  });
}
