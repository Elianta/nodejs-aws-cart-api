# -----------------------------
# 👷 Builder Stage
# -----------------------------
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate && npx prisma -v

# Copy source code and tsconfig
COPY tsconfig*.json ./
COPY src ./src

# Build the application
RUN npm run build

# Clean up dev dependencies
RUN npm prune --omit=dev

# Clean Prisma files
RUN rm -rf \
  node_modules/.prisma/client/schema.prisma \
  node_modules/@prisma/client/node_modules && \
  find node_modules/@prisma/engines -type f \
    ! -name "libquery_engine-linux-arm64-openssl-1.1.x.so.node" -delete

# Clean unnecessary files
RUN find node_modules -type f -name "*.d.ts" -delete && \
    find node_modules -type f -name "*.map" -delete && \
    find node_modules -type f -name "*.ts" -delete

# -----------------------------
# 🏗 Production Stage
# -----------------------------
FROM gcr.io/distroless/nodejs20-debian11

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production

EXPOSE 4000

CMD ["dist/main"]