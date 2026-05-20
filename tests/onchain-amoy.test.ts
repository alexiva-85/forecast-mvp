import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AMOY_REFERENCE,
  getCtfExchangeAddress,
  getEip712ExchangeDomainVersion,
  getUmaCtfAdapterAddress,
} from "../src/lib/onchain/addresses";
import {
  buildBridgeIntent,
  emptyV2OrderTemplate,
} from "../src/lib/onchain/bridge-stub";

const ROOT = join(import.meta.dirname, "..");

describe("onchain addresses (E5)", () => {
  it("amoy-reference.json has required contracts", () => {
    const raw = JSON.parse(
      readFileSync(
        join(ROOT, "contracts/addresses/amoy-reference.json"),
        "utf8",
      ),
    );
    expect(raw.chainId).toBe(80002);
    expect(raw.contracts.ctfExchange).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(raw.contracts.conditionalTokens).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(raw.eip712.exchangeDomainVersion).toBe("2");
  });

  it("AMOY_REFERENCE matches file", () => {
    expect(AMOY_REFERENCE.contracts.ctfExchange).toBe(
      "0xE111180000d2663C0091e4f400237545B87B996B",
    );
  });

  it("getCtfExchangeAddress defaults to Amoy reference", () => {
    expect(getCtfExchangeAddress()).toBe(AMOY_REFERENCE.contracts.ctfExchange);
    expect(getEip712ExchangeDomainVersion()).toBe("2");
  });

  it("getUmaCtfAdapterAddress defaults to Amoy reference (E6)", () => {
    expect(getUmaCtfAdapterAddress()).toBe(
      "0x2F6f8DA6A21023E62399801945eed1b1975A4e12",
    );
  });
});

describe("bridge-stub", () => {
  it("buildBridgeIntent returns stub without throwing", () => {
    const intent = buildBridgeIntent({
      tradeId: "t1",
      marketId: "m1",
      outcomeIndex: 0,
      price: 0.55,
      quantity: 10,
      buyerUserId: "u1",
      sellerUserId: "u2",
    });
    expect(intent.status).toBe("stub");
    expect(intent.exchange).toBeTruthy();
    expect(intent.eip712DomainVersion).toBe("2");
  });

  it("emptyV2OrderTemplate has V2 fields", () => {
    const o = emptyV2OrderTemplate("0x0000000000000000000000000000000000000001");
    expect(o.timestamp).toMatch(/^\d+$/);
    expect(o.metadata).toMatch(/^0x/);
    expect(o.builder).toMatch(/^0x/);
    expect(o.side).toBe(0);
  });
});

describe("onchain Amoy RPC smoke", () => {
  const runRpc = process.env.ONCHAIN_RPC_SMOKE === "1";

  it.skipIf(!runRpc)("exchange and CTF have bytecode on Amoy", async () => {
    const rpc =
      process.env.POLYGON_AMOY_RPC_URL ||
      "https://rpc-amoy.polygon.technology";
    const { contracts: c } = AMOY_REFERENCE;

    async function codeLen(addr: string) {
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getCode",
          params: [addr, "latest"],
        }),
      });
      const json = (await res.json()) as { result?: string };
      const code = json.result ?? "0x";
      return code.length;
    }

    expect(await codeLen(c.ctfExchange!)).toBeGreaterThan(10);
    expect(await codeLen(c.conditionalTokens!)).toBeGreaterThan(10);
  });
});
