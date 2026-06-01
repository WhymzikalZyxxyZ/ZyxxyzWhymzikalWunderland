# ── Stage 1: builder ─────────────────────────────────────────────────────────
# Installs deps, lints, tests, and minifies the site.
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run lint && npm test && node scripts/minify.js

# ── Stage 2: server ───────────────────────────────────────────────────────────
# Serves the built site with nginx.  Does not contain Node or source files.
FROM nginx:alpine AS server
COPY --from=builder /app /usr/share/nginx/html
RUN rm -rf /usr/share/nginx/html/node_modules \
           /usr/share/nginx/html/tests \
           /usr/share/nginx/html/coverage \
           /usr/share/nginx/html/.github \
           /usr/share/nginx/html/scripts \
           /usr/share/nginx/html/package*.json \
           /usr/share/nginx/html/Dockerfile \
           /usr/share/nginx/html/docker-compose.yml \
           /usr/share/nginx/html/docker
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
