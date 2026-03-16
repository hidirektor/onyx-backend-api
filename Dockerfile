# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:25-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM node:25-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app

# Non-root user for security
RUN addgroup -S onyx && adduser -S onyx -G onyx

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN chown -R onyx:onyx /app
USER onyx

EXPOSE 2805

CMD ["node", "server.js"]
