FROM node:22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# production stage
FROM nginx:stable-alpine AS production
# Pick up Alpine package fixes the nginx base image hasn't been rebuilt with yet.
RUN apk upgrade --no-cache
WORKDIR /app
COPY --from=build /app/dist /app
COPY deployment/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Default to production build
FROM production
