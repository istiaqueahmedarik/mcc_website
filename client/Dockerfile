# syntax=docker/dockerfile:1

# ---------- deps: install all dependencies (with dev) for the build ----------
FROM node:24-alpine AS deps

WORKDIR /app

# libc6-compat is needed by sharp's prebuilt musl binary and some other native deps
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./

# Cache mount for npm store
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund


# ---------- builder: produce the standalone Next.js build ----------
FROM node:24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

# Reuse the node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* and other build-time env (set via build.args in compose).
# These are inlined into the JS bundles by Next at build time.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SERVER_URL
ARG NEXT_PUBLIC_WEBSITE_URL
ARG NEXT_PUBLIC_FACEBOOK_URL
ARG NEXT_PUBLIC_LINKEDIN_URL
ARG NEXT_PUBLIC_DISCORD_URL
ARG NEXT_PUBLIC_DEBUG_PROFILE_BATCH
# next.config.mjs reads these at build time for images.remotePatterns
ARG SUPABASE_URL
ARG HOST_NAME
ARG NODE_ENV=production

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

RUN npm run build


# ---------- runner: minimal image with only what's needed to serve ----------
FROM node:24-alpine AS runner

WORKDIR /app

RUN apk add --no-cache libc6-compat wget

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Next standalone output: .next/standalone contains server.js + a slimmed node_modules
# .next/static contains the static assets
# public/ is referenced directly at runtime
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# .next/cache is created at runtime by Next for incremental cache; needs a writable tmpfs at runtime
# (handled in compose with tmpfs)

USER node

EXPOSE 3000

CMD ["node", "server.js"]
