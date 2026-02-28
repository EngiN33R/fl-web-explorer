# --- Build stage ---
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.8.0 --activate

WORKDIR /app

# Copy fl-node-orm so the workspace link override resolves from /app
COPY --from=fl-node-orm . /fl-node-orm

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY api/package.json ./api/
COPY client/package.json ./client/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy client source
COPY client/ ./client/

# VITE_API_URL is baked in at build time
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=${VITE_API_URL}

RUN pnpm --filter fl-web-explorer run build

# --- Serve with nginx ---
FROM nginx:alpine

COPY --from=build /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
