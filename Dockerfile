FROM node:22@sha256:e273cf2a19c7334c03f52e2ca933ecdfc3fbfaad49db7b8bc8c3edd9ac34e9c7 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# production stage
FROM nginx:stable-alpine@sha256:4db33bbf2cfb8f93c47f2dca1e5ce856a1af6af1e0cf72fe3a76312c9a857170 AS production
# image-scan:os-patches begin
# Managed by compliance-framework/workflows image-scan (docs/image-scan.md#os-package-patches); removed once the base image ships the fixes.
RUN apk upgrade --no-cache zlib
# image-scan:os-patches end
# Pick up Alpine package fixes the nginx base image hasn't been rebuilt with yet.
RUN apk upgrade --no-cache
WORKDIR /app
COPY --from=build /app/dist /app
COPY deployment/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Default to production build
FROM production
