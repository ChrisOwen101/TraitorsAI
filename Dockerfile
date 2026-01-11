# Build stage - compile all packages
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json tsconfig.json ./

# Copy all packages
COPY packages ./packages

# Install dependencies
RUN npm ci

# Clean any stale build artifacts and build all packages
RUN rm -rf packages/*/tsconfig.tsbuildinfo packages/*/dist && npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package files from builder
COPY package.json package-lock.json ./
COPY packages ./packages

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built files from builder
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/frontend/dist ./packages/frontend/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 404) throw new Error(r.statusCode)})"

CMD ["node", "packages/backend/dist/index.js"]
