FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html components.json ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM caddy:2.10-alpine AS runtime

COPY Caddyfile /etc/caddy/Caddyfile
COPY docker-entrypoint.sh /usr/local/bin/seev-frontend-entrypoint
COPY --from=build /app/dist /usr/share/nginx/html
RUN chmod +x /usr/local/bin/seev-frontend-entrypoint

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/seev-frontend-entrypoint"]
