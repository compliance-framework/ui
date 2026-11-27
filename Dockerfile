FROM node:22@sha256:7c400d78797d8cbe3f6bb21d2227b86af4cd24b0014cc9f62ff989cc16de988e AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# production stage
FROM nginx:stable-alpine@sha256:8eb04fe3b385090e9aa02961f77398ad09b6bf33ab07f6669a5bb7acce22c0d3 AS production
# image-scan:os-patches begin
# Managed by compliance-framework/workflows image-scan (docs/image-scan.md#os-package-patches); removed once the base image ships the fixes.
RUN apk upgrade --no-cache libxml2 zlib
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
