#!/usr/bin/env bash
set -euo pipefail
wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
