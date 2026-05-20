#!/usr/bin/env node
/**
 * E7 — seed / refresh off-chain MM liquidity on open markets.
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 * Optional: MM_BOT_EMAIL, MM_BOT_PASSWORD, MM_MARKET_SLUGS, MM_MID, MM_SPREAD, MM_LEVELS, MM_SIZE, MM_DRY_RUN
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import {
  buildQuoteLadder,
  inferMidFromOrders,
  totalSellSize,
} from "./quote.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");

/** Node 20 needs explicit ws transport (see tests/helpers/clients.ts). */
const supabaseClientOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
};

function loadEnvLocal() {
  const path = join(root, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function envNum(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Seed slugs from supabase/seed.sql — default target for mm:seed */
const DEFAULT_MM_SLUGS = [
  "btc-150k-2026",
  "real-madrid-ucl-2026",
  "russia-world-cup-2026",
];

const TEST_SLUG_PREFIXES = ["draft-market-", "sandbox-draft-"];

function parseSlugList() {
  const raw = process.env.MM_MARKET_SLUGS?.trim();
  if (raw === "*" || process.env.MM_INCLUDE_ALL_OPEN === "1") {
    return null;
  }
  if (raw) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return DEFAULT_MM_SLUGS;
}

function filterMarkets(markets) {
  if (process.env.MM_INCLUDE_ALL_OPEN === "1") {
    return markets.filter(
      (m) => !TEST_SLUG_PREFIXES.some((p) => m.slug.startsWith(p)),
    );
  }
  return markets;
}

async function ensureMmUser(admin, anon) {
  const email =
    process.env.MM_BOT_EMAIL?.trim() || "mm-bot@forecast.local";
  const password = process.env.MM_BOT_PASSWORD?.trim();
  if (!password) {
    const envPath = join(root, ".env.local");
    throw new Error(
      `MM_BOT_PASSWORD is missing.\n` +
        `  • Add to ${envPath} (see .env.example, block E7), or\n` +
        `  • Run once: MM_BOT_PASSWORD='your-secret' npm run mm:seed\n` +
        `Generate: openssl rand -base64 24`,
    );
  }

  const { data: list, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) throw listErr;
  let user = list?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );

  if (!user) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: "MM Bot" },
    });
    if (error) throw error;
    user = created.user;
    console.log(`Created MM user ${email}`);
  }

  const balance = envNum("MM_BOT_BALANCE", 500_000);
  const { error: profErr } = await admin
    .from("profiles")
    .update({ is_mm_bot: true, balance })
    .eq("id", user.id);
  if (profErr) throw profErr;

  const { data: authData, error: signErr } = await anon.auth.signInWithPassword({
    email,
    password,
  });
  if (signErr || !authData?.session) {
    throw signErr ?? new Error("MM sign-in failed");
  }

  const mm = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      ...supabaseClientOptions,
      global: {
        headers: { Authorization: `Bearer ${authData.session.access_token}` },
      },
    },
  );

  return { mm, userId: user.id, email };
}

async function listTargetMarkets(admin, slugs) {
  let q = admin
    .from("markets")
    .select("id, slug, title, status, is_sandbox, outcome_mode")
    .eq("status", "open")
    .eq("is_sandbox", false);

  if (slugs?.length) {
    q = q.in("slug", slugs);
  }

  const { data, error } = await q.order("slug");
  if (error) throw error;
  return data ?? [];
}

async function isBinaryMarket(admin, marketId) {
  const { data, error } = await admin
    .from("market_outcomes")
    .select("outcome_key")
    .eq("market_id", marketId);
  if (error) throw error;
  const keys = (data ?? []).map((r) => r.outcome_key);
  if (keys.length <= 2) return { ok: true, quoteSide: keys.includes("yes") ? "yes" : keys[0] };
  return { ok: false, quoteSide: null };
}

async function cancelMmOrders(mm, marketId, userId) {
  const { data: orders, error } = await mm
    .from("orders")
    .select("id")
    .eq("market_id", marketId)
    .eq("user_id", userId)
    .eq("status", "open");
  if (error) throw error;

  for (const o of orders ?? []) {
    const { error: cancelErr } = await mm.rpc("cancel_order", {
      p_order_id: o.id,
    });
    if (cancelErr) throw cancelErr;
  }
  return orders?.length ?? 0;
}

async function ensureInventory(admin, userId, marketId, quoteSide, needed) {
  const { data: pos } = await admin
    .from("positions")
    .select("shares")
    .eq("user_id", userId)
    .eq("market_id", marketId)
    .eq("side", quoteSide)
    .maybeSingle();

  const current = Number(pos?.shares ?? 0);
  if (current >= needed) return current;

  const target = Math.max(needed, envNum("MM_INVENTORY_MIN", 500));
  const { error } = await admin.from("positions").upsert({
    user_id: userId,
    market_id: marketId,
    side: quoteSide,
    shares: target,
  });
  if (error) throw error;
  return target;
}

async function requoteMarket(mm, admin, market, userId, cfg, dryRun) {
  const binary = await isBinaryMarket(admin, market.id);
  if (!binary.ok || !binary.quoteSide) {
    console.warn(`  skip ${market.slug}: multi-outcome (E7 binary only)`);
    return { skipped: true };
  }

  const quoteSide = binary.quoteSide;
  const cancelled = await cancelMmOrders(mm, market.id, userId);

  const { data: bookOrders } = await mm
    .from("orders")
    .select("direction, price, user_id")
    .eq("market_id", market.id)
    .eq("status", "open")
    .eq("side", quoteSide);

  const others = (bookOrders ?? []).filter((o) => o.user_id !== userId);
  const midOverride = process.env.MM_MID?.trim();
  const mid =
    midOverride != null && midOverride !== ""
      ? Number(midOverride)
      : inferMidFromOrders(others, 0.5);

  const legs = buildQuoteLadder(mid, cfg);
  const sellNeed = totalSellSize(legs);

  if (dryRun) {
    console.log(
      `  [dry-run] ${market.slug}: mid=${mid} cancelled=${cancelled} legs=${legs.length} sellNeed=${sellNeed}`,
    );
    return { dryRun: true, legs: legs.length };
  }

  await ensureInventory(admin, userId, market.id, quoteSide, sellNeed);

  let placed = 0;
  for (const leg of legs) {
    const { error } = await mm.rpc("place_order", {
      p_market_id: market.id,
      p_side: quoteSide,
      p_direction: leg.direction,
      p_price: leg.price,
      p_size: leg.size,
    });
    if (error) throw new Error(`${market.slug} ${leg.direction}@${leg.price}: ${error.message}`);
    placed += 1;
  }

  console.log(
    `  OK ${market.slug}: mid=${mid} cancelled=${cancelled} placed=${placed} side=${quoteSide}`,
  );
  return { placed };
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    throw new Error(
      "Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  const admin = createClient(url, serviceKey, supabaseClientOptions);
  const anon = createClient(url, anonKey, supabaseClientOptions);

  const cfg = {
    spread: envNum("MM_SPREAD", 0.02),
    levels: Math.max(1, Math.floor(envNum("MM_LEVELS", 3))),
    step: envNum("MM_STEP", 0.02),
    sizePerLevel: envNum("MM_SIZE", 25),
  };
  const dryRun = process.env.MM_DRY_RUN === "1";

  const { mm, userId, email } = await ensureMmUser(admin, anon);
  console.log(`MM bot: ${email} (${userId}) dryRun=${dryRun}`);

  const slugs = parseSlugList();
  const markets = filterMarkets(await listTargetMarkets(admin, slugs));
  if (!markets.length) {
    console.log(
      slugs
        ? "No matching open markets (check MM_MARKET_SLUGS and status=open)."
        : "No open production markets to quote.",
    );
    return;
  }

  const useDefaultSlugs =
    !process.env.MM_MARKET_SLUGS?.trim() &&
    process.env.MM_INCLUDE_ALL_OPEN !== "1";
  const targetHint =
    slugs === null
      ? " (all open non-sandbox, test slugs excluded)"
      : useDefaultSlugs
        ? " (default seed slugs)"
        : "";
  console.log(`Markets${targetHint}: ${markets.map((m) => m.slug).join(", ")}`);
  for (const market of markets) {
    await requoteMarket(mm, admin, market, userId, cfg, dryRun);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
