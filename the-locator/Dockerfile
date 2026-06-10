FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app/worker
COPY worker/package*.json ./
RUN npm ci
COPY worker/ ./
# Place the built client assets where wrangler.toml expects them
COPY --from=client-builder /app/client/dist ../client/dist
EXPOSE 8787
# --local runs entirely in-process with no Cloudflare account required
CMD ["npx", "wrangler", "dev", "--local", "--port", "8787", "--host", "0.0.0.0"]
