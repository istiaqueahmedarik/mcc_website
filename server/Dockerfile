# syntax=docker/dockerfile:1

# ---------- deps: install production deps ----------
FROM oven/bun:1-alpine AS deps

WORKDIR /app

# Bun's alpine image ships with tzdata; keep it. Add wget for healthchecks.
RUN apk add --no-cache wget

COPY package.json bun.lock* ./

# Cache mount for Bun's install cache. --production skips devDependencies.
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production


# ---------- runtime: copy only the production node_modules + src tree ----------
FROM oven/bun:1-alpine AS runtime

WORKDIR /app

# wget for the compose healthcheck, tzdata for Asia/Dhaka timezone support
RUN apk add --no-cache wget tzdata

ENV NODE_ENV=production

# Production node_modules from deps stage
COPY --from=deps --chown=bun:bun /app/node_modules ./node_modules
# All server source (controllers, routes, utils, workers, services, middleware, contests, types)
COPY --chown=bun:bun package.json tsconfig.json ./
COPY --chown=bun:bun src ./src

# Drop to the unprivileged 'bun' user (uid 1000 in oven/bun:* images)
USER bun

EXPOSE 5000

# Default: run the HTTP+WS backend. The bot service overrides CMD via compose.
CMD ["bun", "src/index.ts"]