#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

cd "$BACKEND_DIR"

if [ ! -f .env ]; then
  echo "Missing backend/.env. Copy backend/.env.example to backend/.env and set real values."
  exit 1
fi

npm ci --omit=dev
pm2 startOrReload ecosystem.config.cjs --env production
pm2 save

echo "Backend deployed. Check with: pm2 logs codevault-api"
