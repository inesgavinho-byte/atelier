# ATELIER execution worker — Railway image (ADR-0002).
# Build context is apps/worker (set Railway's Root Directory to apps/worker),
# so the worker installs standalone and does not pull the web app's deps.

FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json worker.ts ./
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
# git is needed by the Claude Code CLI for its file/edit tooling; the CLI itself
# runs each job's prompt (ADR-0002 runtime). Authenticate via ANTHROPIC_API_KEY.
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g @anthropic-ai/claude-code \
  && npm cache clean --force
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
CMD ["node", "dist/worker.js"]
