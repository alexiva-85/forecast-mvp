#!/usr/bin/env node
/**
 * E6: initialize a binary question on UmaCtfAdapter (Amoy).
 * Requires: ONCHAIN_DEPLOYER_PK (funded wallet), @polymarket/uma-ctf-adapter-sdk + ethers@5.
 *
 * Env: UMA_INIT_TITLE, UMA_INIT_DESCRIPTION, UMA_INIT_OUTCOMES=Yes,No,
 *      UMA_REWARD_TOKEN (default: Amoy pUSD), UMA_REWARD, UMA_BOND, UMA_LIVENESS, MARKET_SLUG
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");

function loadAddresses() {
  return JSON.parse(
    readFileSync(join(root, "contracts/addresses/amoy-reference.json"), "utf8"),
  );
}

async function main() {
  const pk = process.env.ONCHAIN_DEPLOYER_PK;
  const addrs = loadAddresses();
  const chainId = addrs.chainId ?? 80002;
  const adapter = addrs.contracts?.umaCtfAdapter;

  console.log(`UMA CTF Adapter init (chainId=${chainId})`);
  console.log(`  adapter: ${adapter}`);

  if (!adapter) throw new Error("umaCtfAdapter missing in amoy-reference.json");

  if (!pk) {
    console.log("\nDry-run: set ONCHAIN_DEPLOYER_PK to send initialize() on Amoy.");
    console.log("  npm install  # ensures uma-ctf-adapter-sdk + ethers");
    process.exit(0);
  }

  let ClientV3;
  let Wallet;
  let BigNumber;
  let providers;
  try {
    ({ ClientV3 } = await import("@polymarket/uma-ctf-adapter-sdk"));
    ({ Wallet, BigNumber, providers } = await import("ethers"));
  } catch {
    console.error("Run: npm install (@polymarket/uma-ctf-adapter-sdk, ethers@5)");
    process.exit(1);
  }

  const rpc =
    process.env.POLYGON_AMOY_RPC_URL ||
    addrs.rpcUrl ||
    "https://rpc-amoy.polygon.technology";

  const outcomes = (process.env.UMA_INIT_OUTCOMES || "Yes,No")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (outcomes.length !== 2) {
    throw new Error("UMA_INIT_OUTCOMES must be two comma-separated labels");
  }

  const signer = new Wallet(pk, new providers.JsonRpcProvider(rpc));
  const client = new ClientV3(signer, chainId, adapter);

  const { questionID, conditionID } = await client.initialize(
    process.env.UMA_INIT_TITLE || "Forecast E6 smoke",
    process.env.UMA_INIT_DESCRIPTION ||
      "Test UMA condition for Forecast MVP (Amoy).",
    outcomes,
    process.env.UMA_REWARD_TOKEN || addrs.contracts.collateralToken,
    BigNumber.from(process.env.UMA_REWARD || "1000000"),
    BigNumber.from(process.env.UMA_BOND || "500000"),
    BigNumber.from(process.env.UMA_LIVENESS || "7200"),
  );

  console.log("\n--- Result ---");
  console.log(`  conditionID: ${conditionID}`);
  console.log(`  questionID:  ${questionID}`);
  console.log("\nPaste into /admin/resolve/… → On-chain panel, or RPC admin_link_market_onchain.");

  const slug = process.env.MARKET_SLUG?.trim();
  if (slug) console.log(`  market slug: ${slug}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
