FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-factor 2 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && for i in 1 2 3; do \
			if npm install --no-fund --no-audit; then \
				break; \
			fi; \
			if [ "$i" -eq 3 ]; then \
				echo "npm install failed after 3 attempts"; \
				exit 1; \
			fi; \
			echo "npm install failed (attempt $i/3), retrying..."; \
			sleep 5; \
		done

FROM base AS development
ENV NODE_ENV=development
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
EXPOSE 3000

FROM base AS build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-factor 2 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && for i in 1 2 3; do \
			if npm install --omit=dev --no-fund --no-audit; then \
				break; \
			fi; \
			if [ "$i" -eq 3 ]; then \
				echo "npm install failed after 3 attempts"; \
				exit 1; \
			fi; \
			echo "npm install failed (attempt $i/3), retrying..."; \
			sleep 5; \
		done
COPY --from=build /app/dist ./dist
COPY .env.example ./.env.example
EXPOSE 3000
CMD ["node", "dist/main.js"]
