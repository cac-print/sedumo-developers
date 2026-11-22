# The site as a Node server, for a copy of this repo that doesn't run on Cloudflare.
# Build: npm run guides (if you have the manual), then docker build -t sedumo-developers .
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-slim
WORKDIR /app
# A PDF sent with a print is up to about 1.5 MB of base64; Node's default request limit is 512 KB.
ENV NODE_ENV=production PORT=3000 BODY_SIZE_LIMIT=4M
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
USER node
EXPOSE 3000
CMD ["node", "build"]
