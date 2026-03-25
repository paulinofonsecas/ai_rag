FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install --no-fund --no-audit

FROM base AS build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev --no-fund --no-audit
COPY --from=build /app/dist ./dist
COPY .env.example ./.env.example
EXPOSE 3000
CMD ["node", "dist/main.js"]
