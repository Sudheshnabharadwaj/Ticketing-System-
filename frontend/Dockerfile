# ── Stage: base ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

# ── Stage: deps ─────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

# ── Stage: dev (hot reload, mounted volume) ──────────────────────────────────
FROM base AS dev
COPY package.json package-lock.json* ./
RUN npm install
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ── Stage: builder ───────────────────────────────────────────────────────────
FROM deps AS builder
COPY . .
RUN npm run build

# ── Stage: prod (standalone output) ─────────────────────────────────────────
FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
