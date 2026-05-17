#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

if (!existsSync(envPath)) {
  console.error("❌ Нет .env.local — скопируйте из .env.example");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const correctRef = "mookbnjtlqqljhlizipb";
const wrongRef = "mookbnjtlqgljhlizipb";

if (url.includes(wrongRef) || !url.includes(correctRef)) {
  console.error("❌ Неверный NEXT_PUBLIC_SUPABASE_URL в .env.local");
  console.error(`   Должен быть: https://${correctRef}.supabase.co`);
  console.error(`   Сейчас:      ${url || "(пусто)"}`);
  process.exit(1);
}

console.log("✅ .env.local — URL Supabase корректный");
