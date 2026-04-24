# ─── Build Stage ───────────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# 1. Install server dependencies (express, multer, better-sqlite3, etc.)
COPY server/package*.json ./server/
RUN cd server && npm install

# 2. Install frontend dependencies
COPY package*.json ./
RUN npm install --ignore-scripts

# 3. Copy all source files
COPY . .

# 4. Build React frontend → dist/renderer/
RUN npm run build:web

# ─── Runtime Stage ──────────────────────────────────────────────────────────────
FROM node:22-slim AS runtime

WORKDIR /app

# Need build tools for better-sqlite3 (native addon)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install only production server dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Copy built React app + JS server
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/server/index.js /app/server/index.js

# Ensure data + uploads directories exist
RUN mkdir -p /app/data /app/data/uploads

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "require('http').get('http://localhost:3000/api/session', r => r.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

CMD ["node", "--experimental-sqlite", "server/index.js"]
