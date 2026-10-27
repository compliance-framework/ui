FROM node:22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# production stage
FROM nginx:stable-alpine AS production
# CVE-2026-111497: pick up the patched Brotli until the nginx base image is rebuilt with it.
RUN apk upgrade --no-cache brotli-libs
WORKDIR /app
COPY --from=build /app/dist /app
COPY deployment/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Default to production build
FROM production
