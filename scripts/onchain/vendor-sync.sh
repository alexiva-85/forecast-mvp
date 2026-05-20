#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOCK="$ROOT/contracts/VENDOR.lock"
VENDOR_DIR="$ROOT/contracts/vendor/ctf-exchange-v2"

if [[ ! -f "$LOCK" ]]; then
  echo "Missing $LOCK"
  exit 1
fi

repo="$(grep -E '^repo=' "$LOCK" | head -1 | cut -d= -f2-)"
commit="$(grep -E '^commit=' "$LOCK" | head -1 | cut -d= -f2-)"

if [[ -z "$repo" || -z "$commit" ]]; then
  echo "VENDOR.lock must define repo= and commit="
  exit 1
fi

mkdir -p "$(dirname "$VENDOR_DIR")"

if [[ ! -d "$VENDOR_DIR/.git" ]]; then
  echo "Cloning $repo → $VENDOR_DIR"
  git clone "$repo" "$VENDOR_DIR"
fi

cd "$VENDOR_DIR"
git fetch origin --quiet
git checkout "$commit" --quiet
echo "ctf-exchange-v2 @ $(git rev-parse --short HEAD) ($(git log -1 --format='%s'))"

if ! command -v forge >/dev/null 2>&1; then
  echo "Foundry not installed. Install: https://book.getfoundry.sh/getting-started/installation"
  exit 1
fi

forge install --quiet 2>/dev/null || true
echo "Vendor sync OK."
