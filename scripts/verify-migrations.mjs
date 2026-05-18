#!/usr/bin/env node
/**
 * Проверяет, что все миграции применены на удалённой БД.
 * Читает NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY из .env.local
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv(resolve(root, ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("❌ Задайте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в .env.local");
  process.exit(1);
}

const checks = [
  {
    name: "001 — place_order",
    async run() {
      const res = await rpc("place_order", {
        p_market_id: "00000000-0000-0000-0000-000000000001",
        p_side: "yes",
        p_direction: "buy",
        p_price: 0.5,
        p_size: 1,
      });
      return res.code === "P0001" && res.message?.includes("Not authenticated");
    },
  },
  {
    name: "002 — cancel_order",
    async run() {
      const res = await rpc("cancel_order", {
        p_order_id: "00000000-0000-0000-0000-000000000001",
      });
      return res.code === "P0001" && res.message?.includes("Not authenticated");
    },
  },
  {
    name: "003 — admin_create_market",
    async run() {
      const res = await rpc("admin_create_market", {
        p_slug: "verify-test",
        p_title: "t",
        p_description: null,
        p_category: "sport",
        p_closes_at: null,
        p_resolution_rules: "r",
        p_resolution_checklist: ["a"],
        p_tags: [],
      });
      return (
        res.code === "P0001" ||
        res.message?.includes("Admin only") ||
        res.message?.includes("Not authenticated")
      );
    },
  },
  {
    name: "003 — resolution_rules column",
    async run() {
      const res = await fetch(
        `${url}/rest/v1/markets?select=resolution_rules,resolution_checklist&limit=1`,
        { headers: headers() },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? res.statusText);
      }
      return true;
    },
  },
  {
    name: "B6 — get_trade_fee_rate",
    async run() {
      const res = await fetch(`${url}/rest/v1/rpc/get_trade_fee_rate`, {
        method: "POST",
        headers: headers(),
        body: "{}",
      });
      if (!res.ok) return false;
      const rate = await res.json();
      return typeof rate === "number" && rate >= 0;
    },
  },
  {
    name: "B6 — platform_settings",
    async run() {
      const res = await fetch(
        `${url}/rest/v1/platform_settings?select=trade_fee_rate,fee_balance&id=eq.1`,
        { headers: headers() },
      );
      return res.ok;
    },
  },
  {
    name: "C5 — markets.tags",
    async run() {
      const res = await fetch(
        `${url}/rest/v1/markets?select=tags&limit=1`,
        { headers: headers() },
      );
      return res.ok;
    },
  },
  {
    name: "G2 — rate_limit_rules",
    async run() {
      const res = await fetch(
        `${url}/rest/v1/rate_limit_rules?select=action,max_requests&limit=1`,
        { headers: headers() },
      );
      return res.ok;
    },
  },
  {
    name: "C4 — close_expired_markets",
    async run() {
      const res = await rpc("close_expired_markets", {});
      return typeof res === "number";
    },
  },
  {
    name: "G3 — update_display_name",
    async run() {
      const res = await rpc("update_display_name", { p_display_name: "x" });
      return res.code === "P0001" && res.message?.includes("Not authenticated");
    },
  },
  {
    name: "B6 — trades.fee_amount",
    async run() {
      const res = await fetch(
        `${url}/rest/v1/trades?select=fee_amount&limit=1`,
        { headers: headers() },
      );
      return res.ok;
    },
  },
  {
    name: "C7 — markets.is_sandbox",
    async run() {
      const res = await fetch(
        `${url}/rest/v1/markets?select=is_sandbox&limit=1`,
        { headers: headers() },
      );
      return res.ok;
    },
  },
  {
    name: "C7 — admin_market_stats",
    async run() {
      const res = await rpc("admin_market_stats", { p_market_ids: null });
      return (
        res.code === "P0001" ||
        res.message?.includes("Admin only") ||
        res.message?.includes("Not authenticated") ||
        Array.isArray(res)
      );
    },
  },
  {
    name: "B4 — place_market_order",
    async run() {
      const res = await rpc("place_market_order", {
        p_market_id: "00000000-0000-0000-0000-000000000001",
        p_side: "yes",
        p_direction: "buy",
        p_size: 1,
        p_time_in_force: "ioc",
      });
      return res.code === "P0001" && res.message?.includes("Not authenticated");
    },
  },
  {
    name: "B4 — orders.order_kind",
    async run() {
      const res = await fetch(
        `${url}/rest/v1/orders?select=order_kind,time_in_force&limit=1`,
        { headers: headers() },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? res.statusText);
      }
      return true;
    },
  },
  {
    name: "D5 — list_my_activity",
    async run() {
      const res = await rpc("list_my_activity", { p_limit: 10 });
      return res.code === "P0001" && res.message?.includes("Not authenticated");
    },
  },
  {
    name: "D5 — account_events",
    async run() {
      const res = await fetch(
        `${url}/rest/v1/account_events?select=id&limit=1`,
        { headers: headers() },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? res.statusText);
      }
      return true;
    },
  },
  {
    name: "C7 — admin_resolve closed only",
    async run() {
      const res = await rpc("admin_resolve_market", {
        p_market_id: "00000000-0000-0000-0000-000000000001",
        p_side: "yes",
      });
      return (
        res.code === "P0001" ||
        res.message?.includes("Admin only") ||
        res.message?.includes("Not authenticated") ||
        res.message?.includes("Market must be closed") ||
        res.message?.includes("Market not found")
      );
    },
  },
];

let failed = 0;

for (const check of checks) {
  try {
    const ok = await check.run();
    if (ok) {
      console.log(`✅ ${check.name}`);
    } else {
      console.log(`❌ ${check.name} — неожиданный ответ`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ${check.name} — ${err.message}`);
    failed++;
  }
}

if (failed > 0) {
  console.log(`\n${failed} проверок не прошло. Выполните: npm run db:push`);
  process.exit(1);
}

console.log("\nВсе миграции на месте.");
process.exit(0);

function headers() {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    "Content-Type": "application/json",
  };
}

async function rpc(fn, body) {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    const key = trimmed.slice(0, i);
    const value = trimmed.slice(i + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}
