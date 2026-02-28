# --- Build stage ---
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.8.0 --activate

WORKDIR /app

# Copy and build fl-node-orm so the link:./fl-node-orm override resolves
COPY --from=fl-node-orm . ./fl-node-orm
RUN cd fl-node-orm && npm install && npm run build

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY api/package.json ./api/
COPY client/package.json ./client/

# Install dependencies
RUN pnpm install

# Copy API source and build config
COPY api/ ./api/

# Build with rolldown (bundles everything except @imagemagick/magick-wasm)
RUN pnpm --filter fl-web-explorer-api run build

# --- Production stage ---
FROM node:22-alpine

WORKDIR /app

# Copy bundled output
COPY --from=build /app/api/dist ./dist

# Install only the runtime external dependency
RUN npm init -y && npm install --save @imagemagick/magick-wasm@0.0.34

ENV PORT=3000
EXPOSE 3000

CMD ["node", "--enable-source-maps", "dist/index.js"]
