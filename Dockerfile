# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:25-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM node:25-alpine AS runtime

ARG APP_VERSION=1.0.0
ENV NODE_ENV=production
ENV APP_VERSION=${APP_VERSION}

LABEL org.opencontainers.image.title="project-onyx-backend-api" \
      org.opencontainers.image.version="${APP_VERSION}"

WORKDIR /app

# Non-root user for security
RUN addgroup -S onyx && adduser -S onyx -G onyx

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN chown -R onyx:onyx /app
USER onyx

EXPOSE 2805

CMD ["node", "server.js"]
