FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app

COPY agent-worker/package.json agent-worker/tsconfig.json ./agent-worker/
COPY shared/package.json shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
COPY package.json package-lock.json ./

RUN npm ci --workspaces --include-workspace-root

COPY agent-worker/src ./agent-worker/src
COPY agent-worker/scripts ./agent-worker/scripts

RUN cd shared && npm run build
RUN cd agent-worker && npm run build

ENV NODE_ENV=production
EXPOSE 8787

CMD ["node", "agent-worker/lib/agent-worker/src/server.js"]
