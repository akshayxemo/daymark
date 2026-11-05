# syntax=docker/dockerfile:1.7
#
# Daymark production image (Next.js standalone output + PostgreSQL migrations).
#
#   docker build -t daymark .
#   docker compose --profile app up -d --build      # see docker-compose.yml
#
# On start the container applies any pending SQL migrations from ./drizzle and
# then serves the application on port 3000. Configuration is read from the
# process environment only (docker-compose.yml passes it via env_file and
# environment); no .env files are baked into the image.

# ---------------------------------------------------------------------------
# base: Node 22 with the pnpm version pinned in package.json#packageManager
# ---------------------------------------------------------------------------
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.34.9 --activate
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------------------------------------------------------------------------
# deps: install the locked dependency tree
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# pnpm-workspace.yaml sets storeDir to ./.pnpm-store, so the BuildKit cache
# mount keeps the content-addressable store between builds.
RUN --mount=type=cache,id=daymark-pnpm-store,target=/app/.pnpm-store \
    pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# build: compile the Next.js application (output: 'standalone')
# ---------------------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Environment variables are validated lazily at request time (see
# src/server/config/env.ts), so the build needs no database URL or secrets.
# If a future change requires build-time values, pass them with --build-arg
# and declare them here with ARG; never COPY a .env file into the image.
# The standalone bundle ships a pruned node_modules. The runner copies the full
# tree instead (see below), so the pruned one is dropped to avoid overlap.
ENV NEXT_OUTPUT=standalone
RUN pnpm build && rm -rf .next/standalone/node_modules

# ---------------------------------------------------------------------------
# runner: minimal runtime as a non-root user
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

# Next.js standalone server, static assets and public files.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

# Migration tooling. scripts/db/migrate.ts runs through tsx and imports the
# Drizzle schema from src/server/db, so those sources, tsconfig.json (for the
# "@/*" path alias) and the drizzle/ migrations folder ship with the image.
# The full node_modules from the deps stage is copied because tsx, drizzle-orm
# and @next/env must be available at runtime; pruning dev dependencies would
# remove tsx, so the image is larger than a pure standalone build. Accepted.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nextjs:nodejs /app/package.json /app/tsconfig.json ./
COPY --from=build --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=build --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=build --chown=nextjs:nodejs /app/src/server ./src/server
COPY --from=build --chown=nextjs:nodejs /app/src/lib ./src/lib

# Writable cache directory for the Next.js image optimizer.
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

USER nextjs

EXPOSE 3000

# wget ships with Alpine's busybox; /api/health also verifies database access.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

# Apply pending migrations, then exec the server so it receives signals
# directly (graceful shutdown on `docker stop`).
CMD ["sh", "-c", "node_modules/.bin/tsx scripts/db/migrate.ts && exec node server.js"]
