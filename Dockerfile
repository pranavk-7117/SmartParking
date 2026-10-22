# -- Stage 1: Builder ----------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Install openssl for Prisma CLI & engine compatibility (Alpine uses apk)
RUN apk add --no-cache openssl ca-certificates

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy Prisma schema & migrations
COPY prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Copy source and configs
COPY tsconfig*.json ./
COPY src ./src

# Compile TypeScript
RUN npm run build

# Prune devDependencies (prisma stays because it is in dependencies)
RUN npm prune --omit=dev

# -- Stage 2: Production Runner ------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install runtime dependencies required by Prisma engine
RUN apk add --no-cache openssl ca-certificates

# Copy built application and production dependencies with node user ownership
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node package.json ./
COPY --chown=node:node docker-entrypoint.sh ./

# Ensure Unix line endings (guards against CRLF from Windows hosts)
RUN sed -i 's/\r//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

# Least-privilege runtime security
USER node

# Expose backend port
EXPOSE 3000

# Health check using node built-in http
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
