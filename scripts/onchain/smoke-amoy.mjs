#!/usr/bin/env node
/**
 * E5 smoke: verify Amoy reference contracts (read-only).
 * Write path (split/mint) — отдельный спринт; нужен funded wallet.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");

function loadAddresses() {
  const profile = process.env.ONCHAIN_ADDRESS_PROFILE || "reference";
  const file =
    profile === "forecast"
      ? join(root, "contracts/addresses/amoy-forecast.json")
      : join(root, "contracts/addresses/amoy-reference.json");
  if (!existsSync(file)) {
    throw new Error(`Missing ${file} (copy from amoy-forecast.template.json for forecast profile)`);
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

async function rpc(method, params) {
  const url =
    process.env.POLYGON_AMOY_RPC_URL ||
    "https://rpc-amoy.polygon.technology";
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "rpc error");
  return json.result;
}

async function getCode(address) {
  const code = await rpc("eth_getCode", [address, "latest"]);
  return code && code !== "0x" ? code.length : 0;
}

function callGetter(contract, sig) {
  const data = execSync(`cast calldata "${sig}"`, { encoding: "utf8" }).trim();
  const raw = execSync(
    `cast rpc eth_call '{"to":"${contract}","data":"${data}"}' latest --rpc-url "${process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology"}"`,
    { encoding: "utf8" },
  ).trim();
  return execSync(`cast abi-decode "${sig}" ${raw}`, { encoding: "utf8" }).trim();
}

async function main() {
  const addrs = loadAddresses();
  const { contracts: c } = addrs;
  console.log(`Smoke Amoy (${addrs.source}) chainId=${addrs.chainId}`);

  const checks = [
    ["ctfExchange", c.ctfExchange],
    ["conditionalTokens", c.conditionalTokens],
    ["collateralToken", c.collateralToken],
    ["umaCtfAdapter", c.umaCtfAdapter],
  ];

  for (const [name, address] of checks) {
    if (!address) {
      console.warn(`  skip ${name}: no address`);
      continue;
    }
    const len = await getCode(address);
    if (len < 10) throw new Error(`${name} ${address}: no bytecode`);
    console.log(`  OK ${name} bytecode chars=${len}`);
  }

  if (c.ctfExchange && c.conditionalTokens && commandExists("cast")) {
    const onChainCtf = callGetter(c.ctfExchange, "getCtf()(address)");
    if (onChainCtf.toLowerCase() !== c.conditionalTokens.toLowerCase()) {
      throw new Error(`getCtf mismatch: ${onChainCtf} != ${c.conditionalTokens}`);
    }
    console.log("  OK getCtf() matches conditionalTokens");
  }

  if (process.env.ONCHAIN_SMOKE_WRITE === "1") {
    console.log("Write smoke: not implemented — see docs/onchain/v2-checklist.md");
  } else {
    console.log("Read-only smoke passed.");
  }
}

function commandExists(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
