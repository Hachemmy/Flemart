# ---- Stage 1 : build TypeScript -> JS ----
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# ---- Stage 2 : dépendances de production uniquement ----
FROM node:20-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

# ---- Stage 3 : image finale ----
FROM node:20-alpine
RUN apk add --no-cache curl
WORKDIR /app

# On garde la même structure relative que le repo (backend/ et database/ côte à côte)
# car backend/src/database/migrate.ts résout le chemin ../../../database/migrations
COPY --from=deps  /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY backend/package.json ./backend/package.json
COPY database ./database

WORKDIR /app/backend
EXPOSE 5000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD curl -f http://localhost:5000/health || exit 1

# Applique les migrations puis démarre le serveur
CMD ["sh", "-c", "node dist/database/migrate.js && node dist/server.js"]
