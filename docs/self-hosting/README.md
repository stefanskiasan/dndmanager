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
                    +---------------+
                    |   Browser     |
                    +-------+-------+
                            |
              +-------------+-------------+
              | :3000       |             | :8000
        +-----v------+     |      +------v-------+
        |  Next.js   |     |      |    Kong      |
        |    App     |     |      |  Gateway     |
        +------------+     |      +------+-------+
                           |       +-----+-----+
                           |       v     v     v
                           |    Auth  REST  Realtime  Storage
                           |       |     |     |        |
                           |       +-----+-----+--------+
                           |             v
                           |      +------------+
                           |      | PostgreSQL |
                           |      +------------+
```
