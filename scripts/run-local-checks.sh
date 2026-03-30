#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> BlockSocial Plants Calendar local checks"

if ! command -v cargo >/dev/null 2>&1; then
  echo "[ERROR] cargo not found. Install Rust via https://rustup.rs first."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[WARN] node not found. Skipping desktop-ui JavaScript syntax/build checks."
  SKIP_NODE=1
else
  SKIP_NODE=0
fi

echo "==> cargo fmt --all --check"
cargo fmt --all --check

echo "==> cargo check --workspace"
cargo check --workspace

echo "==> cargo test -p shared"
cargo test -p shared

echo "==> cargo test -p backend -- --nocapture"
cargo test -p backend -- --nocapture

if [[ "$SKIP_NODE" -eq 0 ]]; then
  echo "==> node --check desktop-ui/src/main.js"
  node --check desktop-ui/src/main.js

  if [[ -f desktop-ui/package.json ]]; then
    (
      cd desktop-ui
      if [[ -f package-lock.json ]]; then
        echo "==> npm ci (desktop-ui)"
        npm ci --no-audit --no-fund
      else
        echo "==> npm install (desktop-ui)"
        npm install --no-audit --no-fund
      fi
      echo "==> npm run check"
      npm run check
      echo "==> npm run build"
      npm run build
    )
  fi
fi

echo "==> done"
