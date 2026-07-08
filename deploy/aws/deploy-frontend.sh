#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
WEB_ROOT="/var/www/codevault"

cd "$FRONTEND_DIR"

npm ci
npm run build

sudo mkdir -p "$WEB_ROOT"
sudo rsync -a --delete dist/ "$WEB_ROOT"/
sudo chown -R www-data:www-data "$WEB_ROOT"

sudo nginx -t
sudo systemctl reload nginx

echo "Frontend deployed. Check with: curl http://127.0.0.1/"
