#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VENDOR="$ROOT/contracts/vendor/ctf-exchange-v2"
ENV_FILE="$VENDOR/.env.testnet"
REF="$ROOT/contracts/addresses/amoy-reference.json"

bash "$ROOT/scripts/onchain/vendor-sync.sh"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Create $ENV_FILE from contracts/.env.testnet.example and set PK, ADMIN, FEE_RECEIVER"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq required for deploy script"
  exit 1
fi

# Ensure deps from reference JSON if missing in .env.testnet
patch_env() {
  local key="$1" json_key="$2"
  if ! grep -q "^${key}=" "$ENV_FILE" 2>/dev/null || grep -q "^${key}=$" "$ENV_FILE"; then
    val="$(jq -r ".contracts.${json_key}" "$REF")"
    if grep -q "^${key}=" "$ENV_FILE"; then
      sed -i.bak "s|^${key}=.*|${key}=${val}|" "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
    else
      echo "${key}=${val}" >>"$ENV_FILE"
    fi
  fi
}

patch_env COLLATERAL collateralToken
patch_env CTF conditionalTokens
patch_env CTF_COLLATERAL ctfCollateralAdapter
patch_env PROXY_FACTORY proxyFactory
patch_env SAFE_FACTORY safeFactory

cd "$VENDOR"
bash deploy/scripts/deploy_exchange.sh testnet

echo ""
echo "Update contracts/addresses/amoy-forecast.json with the Exchange address above."
