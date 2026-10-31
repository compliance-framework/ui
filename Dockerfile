FROM node:22@sha256:18a6d90fd60542269850c80ca03b29b1d9b14d6b221ac7ee8e35b0d33ef904bd AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# production stage
FROM nginx:stable-alpine@sha256:0e52bd054126cdc040b1276c0af347aeb02a41b9cfe305d6094767ac30e97949 AS production
# image-scan:os-patches begin
# Managed by compliance-framework/workflows image-scan (docs/image-scan.md#os-package-patches); removed once the base image ships the fixes.
RUN apk upgrade --no-cache brotli-libs curl libcurl
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
