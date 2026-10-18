# syntax=docker/dockerfile:1
# Web image: the built frontend served by Caddy, which also proxies /api to the backend
# and gets the HTTPS certificate on its own (see Caddyfile).

FROM node:22-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Same origin as the site: Caddy sends /api to the backend.
ARG VITE_API_BASE_URL=/api
# "2026-10-19 bb92f59", shown in "Góp ý"; there is no git inside the build.
ARG VITE_APP_VERSION=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL VITE_APP_VERSION=$VITE_APP_VERSION
RUN npm run build

FROM caddy:2.10-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /src/dist /srv
