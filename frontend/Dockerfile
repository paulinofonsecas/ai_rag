FROM node:20-alpine AS base

WORKDIR /app/frontend

COPY frontend/package*.json ./
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

WORKDIR /app

COPY frontend ./frontend
COPY docs ./docs

WORKDIR /app/frontend

EXPOSE 3000

CMD ["npm", "run", "dev:watch"]

FROM base AS production

WORKDIR /app

COPY frontend ./frontend
COPY docs ./docs

WORKDIR /app/frontend
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
