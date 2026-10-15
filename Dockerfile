# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20 AS builder
WORKDIR /app

# Install dependencies (including dev for typescript and prisma)
COPY package*.json ./
RUN npm ci

# Copy source, seed, and Prisma schema
COPY prisma ./prisma
COPY src ./src
COPY tsconfig*.json ./

# Generate Prisma client and compile TypeScript
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20 AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy compiled output and Prisma runtime files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

# Expose backend port
EXPOSE 3000

# Run migrations, seed (idempotent upserts), then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && node dist/index.js"]
