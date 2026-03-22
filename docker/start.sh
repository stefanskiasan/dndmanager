#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f .env ]; then
  echo "No .env file found. Creating from template..."
  cp .env.docker .env
  echo ""
  echo "IMPORTANT: Edit docker/.env and fill in your secrets before continuing."
  echo "See docs/self-hosting/README.md for instructions."
  exit 1
fi

echo "Starting dndmanager..."
docker compose up -d --build

echo ""
echo "Waiting for services to be ready..."
sleep 5

if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "dndmanager is running at http://localhost:3000"
else
  echo "App is still starting up. Check status with: docker compose ps"
fi
