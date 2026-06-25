FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.0

# ── Dependencies stage ────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json  ./packages/shared/
COPY packages/db/package.json      ./packages/db/
COPY apps/backend/package.json     ./apps/backend/
RUN pnpm install --frozen-lockfile

# ── Build stage ───────────────────────────────────────────────
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules             ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/db/node_modules     ./packages/db/node_modules
COPY --from=deps /app/apps/backend/node_modules    ./apps/backend/node_modules
COPY . .
RUN pnpm --filter=@focal/backend build

# ── Production stage ──────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Only copy what's needed to run
COPY --from=build /app/apps/backend/dist  ./dist
COPY --from=build /app/node_modules       ./node_modules
COPY --from=build /app/packages           ./packages

# Non-root user for security
RUN addgroup --system focal && adduser --system --ingroup focal focal
USER focal

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://localhost:3001/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

CMD ["node", "dist/server.js"]
