# Phase 4.2: Docker Self-Hosting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a complete Docker-based self-hosting solution so users can run the entire dndmanager platform (Next.js app + full Supabase stack) with a single `docker compose up`.

**Architecture:** A `docker/` directory at the repo root holds the Dockerfile, docker-compose.yml, env template, and init scripts. The Supabase stack uses official images (PostgreSQL 17, GoTrue, Realtime, Storage API, PostgREST, Kong gateway). The Next.js app builds as a standalone output in a multi-stage Docker build. A db-init sidecar runs migrations and seed on first start.

**Tech Stack:** Docker, Docker Compose, Node.js 22 Alpine, PostgreSQL 17, official Supabase Docker images

---

## File Structure

```
docker/
├── Dockerfile                        → Multi-stage build for the Next.js app
├── docker-compose.yml                → Full stack: Supabase services + Next.js app
├── .env.docker                       → Template with all required env vars
├── scripts/
│   ├── db-init.sh                    → Run migrations + seed on first start
│   └── healthcheck.sh                → Simple curl-based health check for app container
├── volumes/
│   └── .gitkeep                      → Placeholder for persistent data (git-ignored)

apps/web/app/api/health/
├── route.ts                          → GET /api/health endpoint

docs/self-hosting/
├── README.md                         → Setup instructions for self-hosters
```

---

### Task 1: Enable Next.js Standalone Output

**Files:**
- Modify: `apps/web/next.config.ts`

- [ ] **Step 1: Add standalone output mode**

Add `output: 'standalone'` to the Next.js config. This tells Next.js to produce a self-contained build in `.next/standalone/` that includes only the necessary `node_modules`, enabling a minimal Docker image.

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: [
    '@dndmanager/shared',
    '@dndmanager/pf2e-engine',
    '@dndmanager/game-runtime',
    '@dndmanager/scene-framework',
    '@dndmanager/ai-services',
  ],
  // ... rest unchanged
}
```

**Commit:** `feat(docker): enable Next.js standalone output mode`

---

### Task 2: Health Check Endpoint

**Files:**
- Create: `apps/web/app/api/health/route.ts`

- [ ] **Step 1: Create /api/health GET endpoint**

A simple health check that verifies the app process is alive and can optionally ping the database. Returns `{ status: 'ok', timestamp }` with HTTP 200 on success.

```typescript
// apps/web/app/api/health/route.ts
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? 'unknown',
    })
  } catch {
    return NextResponse.json(
      { status: 'error', timestamp: new Date().toISOString() },
      { status: 503 }
    )
  }
}
```

- [ ] **Step 2: Add basic test**

Create `apps/web/app/api/health/__tests__/route.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { GET } from '../route'

describe('/api/health', () => {
  it('returns 200 with ok status', async () => {
    const response = await GET()
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(body.timestamp).toBeDefined()
  })
})
```

**Commit:** `feat(docker): add /api/health endpoint`

---

### Task 3: Dockerfile (Multi-Stage Build)

**Files:**
- Create: `docker/Dockerfile`

- [ ] **Step 1: Write multi-stage Dockerfile**

Three stages: `deps` (install all dependencies via pnpm), `builder` (build the Next.js app), `runner` (minimal production image with standalone output).

```dockerfile
# docker/Dockerfile
# -----------------------------------------------------------
# Stage 1: Install dependencies
# -----------------------------------------------------------
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/pf2e-engine/package.json packages/pf2e-engine/package.json
COPY packages/game-runtime/package.json packages/game-runtime/package.json
COPY packages/scene-framework/package.json packages/scene-framework/package.json
COPY packages/ai-services/package.json packages/ai-services/package.json

RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------
# Stage 2: Build
# -----------------------------------------------------------
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/ ./packages/
COPY . .

# Build args become env vars for the Next.js build
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN pnpm --filter @dndmanager/web build

# -----------------------------------------------------------
# Stage 3: Production runner
# -----------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output + static + public assets
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
```

Key points:
- Uses `node:22-alpine` for small image size (~180MB final).
- pnpm workspace structure is preserved so monorepo resolution works.
- Standalone output means no `node_modules` in the final image — only what the app actually imports.
- Build args allow baking Supabase public URL/key at build time (required for Next.js client-side code).

**Commit:** `feat(docker): add multi-stage Dockerfile for Next.js app`

---

### Task 4: Docker Compose with Supabase Stack

**Files:**
- Create: `docker/docker-compose.yml`

- [ ] **Step 1: Write docker-compose.yml with all services**

The compose file defines:
- **db** — PostgreSQL 17 (supabase/postgres image) with persistent volume
- **auth** — GoTrue (supabase/gotrue) for authentication
- **rest** — PostgREST (postgrest/postgrest) for auto-generated REST API
- **realtime** — Supabase Realtime (supabase/realtime) for websocket subscriptions
- **storage** — Supabase Storage API (supabase/storage-api) for file uploads
- **kong** — Kong API gateway (kong image) to route /auth, /rest, /realtime, /storage
- **app** — The dndmanager Next.js app
- **db-init** — One-shot container that runs migrations and seed

```yaml
# docker/docker-compose.yml
name: dndmanager

services:
  # -------------------------------------------------------
  # PostgreSQL
  # -------------------------------------------------------
  db:
    image: supabase/postgres:17.2.0
    restart: unless-stopped
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: postgres
      JWT_SECRET: ${JWT_SECRET}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 10

  # -------------------------------------------------------
  # GoTrue (Auth)
  # -------------------------------------------------------
  auth:
    image: supabase/gotrue:v2.172.1
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      API_EXTERNAL_URL: ${API_EXTERNAL_URL:-http://localhost:8000}
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://supabase_auth_admin:${POSTGRES_PASSWORD}@db:5432/postgres
      GOTRUE_SITE_URL: ${SITE_URL:-http://localhost:3000}
      GOTRUE_URI_ALLOW_LIST: ${ADDITIONAL_REDIRECT_URLS:-}
      GOTRUE_DISABLE_SIGNUP: ${DISABLE_SIGNUP:-false}
      GOTRUE_JWT_SECRET: ${JWT_SECRET}
      GOTRUE_JWT_EXP: ${JWT_EXPIRY:-3600}
      GOTRUE_JWT_DEFAULT_GROUP_NAME: authenticated
      GOTRUE_EXTERNAL_EMAIL_ENABLED: true
      GOTRUE_MAILER_AUTOCONFIRM: ${MAILER_AUTOCONFIRM:-true}
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:9999/health"]
      interval: 5s
      timeout: 5s
      retries: 10

  # -------------------------------------------------------
  # PostgREST (REST API)
  # -------------------------------------------------------
  rest:
    image: postgrest/postgrest:v12.2.8
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      PGRST_DB_URI: postgres://authenticator:${POSTGRES_PASSWORD}@db:5432/postgres
      PGRST_DB_SCHEMAS: public,graphql_public
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${JWT_SECRET}
      PGRST_DB_USE_LEGACY_GUCS: "false"

  # -------------------------------------------------------
  # Realtime
  # -------------------------------------------------------
  realtime:
    image: supabase/realtime:v2.34.47
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      PORT: 4000
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: supabase_admin
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_NAME: postgres
      DB_AFTER_CONNECT_QUERY: "SET search_path TO _realtime"
      DB_ENC_KEY: supabaserealtime
      API_JWT_SECRET: ${JWT_SECRET}
      SECRET_KEY_BASE: ${SECRET_KEY_BASE:-super-secret-key-base-at-least-64-chars-long-for-realtime-service-to-work}
      ERL_AFLAGS: "-proto_dist inet_tcp"
      DNS_NODES: "''"
      RLIMIT_NOFILE: "10000"
      APP_NAME: realtime
      SEED_SELF_HOST: "true"

  # -------------------------------------------------------
  # Storage API
  # -------------------------------------------------------
  storage:
    image: supabase/storage-api:v1.22.15
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
      rest:
        condition: service_started
    environment:
      ANON_KEY: ${ANON_KEY}
      SERVICE_KEY: ${SERVICE_ROLE_KEY}
      DATABASE_URL: postgres://supabase_storage_admin:${POSTGRES_PASSWORD}@db:5432/postgres
      PGRST_JWT_SECRET: ${JWT_SECRET}
      STORAGE_BACKEND: file
      FILE_STORAGE_BACKEND_PATH: /var/lib/storage
      FILE_SIZE_LIMIT: 52428800
      TENANT_ID: stub
      REGION: local
      GLOBAL_S3_BUCKET: stub
      IS_MULTITENANT: "false"
    volumes:
      - storagedata:/var/lib/storage

  # -------------------------------------------------------
  # Kong API Gateway
  # -------------------------------------------------------
  kong:
    image: kong:3.9
    restart: unless-stopped
    ports:
      - "${API_PORT:-8000}:8000"
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /var/lib/kong/kong.yml
      KONG_DNS_ORDER: LAST,A,CNAME
      KONG_PLUGINS: request-transformer,cors,key-auth,acl,basic-auth
      KONG_NGINX_PROXY_PROXY_BUFFER_SIZE: 160k
      KONG_NGINX_PROXY_PROXY_BUFFERS: 64 160k
    volumes:
      - ./kong.yml:/var/lib/kong/kong.yml:ro
    depends_on:
      auth:
        condition: service_healthy

  # -------------------------------------------------------
  # Database Initialization (one-shot)
  # -------------------------------------------------------
  db-init:
    image: supabase/postgres:17.2.0
    depends_on:
      db:
        condition: service_healthy
    environment:
      PGHOST: db
      PGPORT: 5432
      PGUSER: postgres
      PGPASSWORD: ${POSTGRES_PASSWORD}
      PGDATABASE: postgres
    volumes:
      - ../supabase/migrations:/migrations:ro
      - ../supabase/seed.sql:/seed.sql:ro
      - ./scripts/db-init.sh:/db-init.sh:ro
    entrypoint: ["bash", "/db-init.sh"]
    restart: "no"

  # -------------------------------------------------------
  # Next.js App
  # -------------------------------------------------------
  app:
    build:
      context: ..
      dockerfile: docker/Dockerfile
      args:
        NEXT_PUBLIC_SUPABASE_URL: ${API_EXTERNAL_URL:-http://localhost:8000}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${ANON_KEY}
    restart: unless-stopped
    ports:
      - "${APP_PORT:-3000}:3000"
    environment:
      SUPABASE_URL: http://kong:8000
      SUPABASE_ANON_KEY: ${ANON_KEY}
      SUPABASE_SERVICE_ROLE_KEY: ${SERVICE_ROLE_KEY}
    depends_on:
      kong:
        condition: service_started
      db-init:
        condition: service_completed_successfully
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

volumes:
  pgdata:
  storagedata:
```

**Commit:** `feat(docker): add docker-compose.yml with Supabase stack`

---

### Task 5: Kong Gateway Configuration

**Files:**
- Create: `docker/kong.yml`

- [ ] **Step 1: Write Kong declarative config**

Routes requests to the correct Supabase services based on URL path prefix.

```yaml
# docker/kong.yml
_format_version: "2.1"
_transform: true

services:
  - name: auth-v1
    url: http://auth:9999/
    routes:
      - name: auth-v1-route
        strip_path: true
        paths:
          - /auth/v1/
    plugins:
      - name: cors

  - name: rest-v1
    url: http://rest:3000/
    routes:
      - name: rest-v1-route
        strip_path: true
        paths:
          - /rest/v1/
    plugins:
      - name: cors

  - name: realtime-v1
    url: http://realtime:4000/socket/
    routes:
      - name: realtime-v1-route
        strip_path: true
        paths:
          - /realtime/v1/
    plugins:
      - name: cors

  - name: storage-v1
    url: http://storage:5000/
    routes:
      - name: storage-v1-route
        strip_path: true
        paths:
          - /storage/v1/
    plugins:
      - name: cors
```

**Commit:** `feat(docker): add Kong gateway configuration`

---

### Task 6: Database Initialization Script

**Files:**
- Create: `docker/scripts/db-init.sh`

- [ ] **Step 1: Write db-init.sh**

Runs all SQL migration files in order, then the seed file. Uses a marker table to avoid re-running on subsequent container starts.

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "==> Checking if migrations have already been applied..."

# Create a tracking table if it doesn't exist
psql -c "CREATE TABLE IF NOT EXISTS _docker_init (initialized_at TIMESTAMPTZ DEFAULT NOW());" 2>/dev/null

ROW_COUNT=$(psql -t -c "SELECT COUNT(*) FROM _docker_init;" | tr -d ' ')

if [ "$ROW_COUNT" -gt "0" ]; then
  echo "==> Database already initialized, skipping."
  exit 0
fi

echo "==> Running migrations..."
for f in /migrations/*.sql; do
  echo "    Applying: $(basename "$f")"
  psql -f "$f"
done

echo "==> Running seed..."
psql -f /seed.sql

# Mark as initialized
psql -c "INSERT INTO _docker_init DEFAULT VALUES;"

echo "==> Database initialization complete."
```

- [ ] **Step 2: Make script executable**

```bash
chmod +x docker/scripts/db-init.sh
```

**Commit:** `feat(docker): add database initialization script`

---

### Task 7: Environment Template

**Files:**
- Create: `docker/.env.docker`

- [ ] **Step 1: Write env template with all required variables**

```bash
# docker/.env.docker
# Copy this file to docker/.env and fill in your values.
# Run: cp .env.docker .env

# ============================================================
# SECRETS — Generate unique values for production!
# ============================================================

# PostgreSQL password (used by all services)
POSTGRES_PASSWORD=your-super-secret-postgres-password

# JWT secret for Supabase auth (min 32 chars, same across all services)
# Generate with: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-token-at-least-32-chars

# Supabase anon key (JWT with role=anon, signed with JWT_SECRET)
# Generate at: https://supabase.com/docs/guides/self-hosting#api-keys
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MDAwMDAwMCwiZXhwIjoxNzk5OTk5OTk5fQ.placeholder

# Supabase service role key (JWT with role=service_role, signed with JWT_SECRET)
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQwMDAwMDAwLCJleHAiOjE3OTk5OTk5OTl9.placeholder

# Secret key base for Realtime service (min 64 chars)
# Generate with: openssl rand -base64 48
SECRET_KEY_BASE=your-secret-key-base-at-least-64-characters-long-for-realtime

# ============================================================
# URLS & PORTS
# ============================================================

# External URL where the API gateway is reachable (used in auth redirects)
API_EXTERNAL_URL=http://localhost:8000

# URL where the app is reachable (for auth redirects)
SITE_URL=http://localhost:3000

# Port mappings (host:container)
APP_PORT=3000
API_PORT=8000
POSTGRES_PORT=5432

# ============================================================
# AUTH OPTIONS
# ============================================================

# Auto-confirm email signups (set false for production with SMTP)
MAILER_AUTOCONFIRM=true

# Disable public signups (set true to restrict registration)
DISABLE_SIGNUP=false

# Additional allowed redirect URLs (comma-separated)
ADDITIONAL_REDIRECT_URLS=

# ============================================================
# OPTIONAL: AI SERVICES
# ============================================================

# OpenAI API key (for AI character creation, NPC dialog, etc.)
# OPENAI_API_KEY=sk-...
```

**Commit:** `feat(docker): add .env.docker environment template`

---

### Task 8: Health Check Script

**Files:**
- Create: `docker/scripts/healthcheck.sh`

- [ ] **Step 1: Write container health check script**

```bash
#!/usr/bin/env bash
set -euo pipefail
wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
```

**Commit:** `feat(docker): add container healthcheck script`

---

### Task 9: Docker .gitignore and Volume Placeholder

**Files:**
- Create: `docker/volumes/.gitkeep`
- Modify: `.gitignore` (root)

- [ ] **Step 1: Add .gitkeep for volumes directory**

Create an empty `docker/volumes/.gitkeep` so the directory structure is preserved in git.

- [ ] **Step 2: Update root .gitignore**

Add the following entries:

```
# Docker
docker/.env
docker/volumes/*
!docker/volumes/.gitkeep
```

**Commit:** `feat(docker): add volume placeholder and gitignore entries`

---

### Task 10: Self-Hosting Documentation

**Files:**
- Create: `docs/self-hosting/README.md`

- [ ] **Step 1: Write setup documentation**

```markdown
# Self-Hosting dndmanager

Run the complete dndmanager platform on your own infrastructure using Docker.

## Prerequisites

- Docker Engine 24+ and Docker Compose v2
- 2GB RAM minimum (4GB recommended)
- 10GB disk space

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/dndmanager.git
   cd dndmanager
   ```

2. **Create your environment file**
   ```bash
   cp docker/.env.docker docker/.env
   ```

3. **Generate secrets**
   ```bash
   # Generate JWT secret
   openssl rand -base64 32
   # Generate Postgres password
   openssl rand -base64 24
   # Generate Realtime secret key base
   openssl rand -base64 48
   ```
   Edit `docker/.env` and fill in the generated values.

4. **Generate Supabase API keys**

   Visit the [Supabase JWT Generator](https://supabase.com/docs/guides/self-hosting#api-keys) or use the CLI:
   ```bash
   # Use your JWT_SECRET to sign these JWTs
   # anon key: payload { "role": "anon", "iss": "supabase", "iat": 1640000000, "exp": 1799999999 }
   # service_role key: payload { "role": "service_role", "iss": "supabase", "iat": 1640000000, "exp": 1799999999 }
   ```
   Set `ANON_KEY` and `SERVICE_ROLE_KEY` in `docker/.env`.

5. **Start all services**
   ```bash
   cd docker
   docker compose up -d
   ```

6. **Verify**
   ```bash
   # Check all containers are running
   docker compose ps

   # Check app health
   curl http://localhost:3000/api/health
   ```

The app is available at `http://localhost:3000`.
The Supabase API is at `http://localhost:8000`.

## Updating

```bash
git pull
cd docker
docker compose build app
docker compose up -d
```

The `db-init` container will automatically apply any new migrations on restart.

## Configuration

See `docker/.env.docker` for all available environment variables.

### Exposing to the Internet

When running behind a reverse proxy (nginx, Caddy, Traefik):

1. Set `API_EXTERNAL_URL` to your public API URL (e.g., `https://api.yourdomain.com`)
2. Set `SITE_URL` to your public app URL (e.g., `https://play.yourdomain.com`)
3. Proxy port 3000 (app) and 8000 (API) from your reverse proxy

### Disabling Signups

Set `DISABLE_SIGNUP=true` in `docker/.env` to prevent new user registrations.

## Troubleshooting

**Container keeps restarting:**
Check logs with `docker compose logs <service-name>` — most common issue is incorrect JWT_SECRET or missing env vars.

**Database connection errors:**
Ensure `POSTGRES_PASSWORD` is the same across all services. Run `docker compose down -v` to wipe volumes and start fresh.

**Auth redirects to wrong URL:**
Verify `SITE_URL` and `API_EXTERNAL_URL` match your actual deployment URLs.

## Architecture

```
                    ┌──────────────┐
                    │   Browser    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │ :3000      │            │ :8000
        ┌─────▼─────┐     │     ┌──────▼──────┐
        │  Next.js   │     │     │    Kong     │
        │    App     │     │     │  Gateway    │
        └────────────┘     │     └──────┬──────┘
                           │      ┌─────┼─────┐
                           │      ▼     ▼     ▼
                           │   Auth  REST  Realtime  Storage
                           │      │     │     │        │
                           │      └─────┼─────┘────────┘
                           │            ▼
                           │     ┌────────────┐
                           │     │ PostgreSQL │
                           │     └────────────┘
```
```

**Commit:** `docs: add self-hosting setup documentation`

---

### Task 11: Root-Level Convenience Script

**Files:**
- Create: `docker/start.sh`

- [ ] **Step 1: Write a quick-start convenience script**

```bash
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
```

- [ ] **Step 2: Make script executable**

```bash
chmod +x docker/start.sh
```

**Commit:** `feat(docker): add convenience start script`
