FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
# One COPY per package — multi-source COPY can flatten dirs on some builders (breaks workspace)
COPY packages/contracts ./packages/contracts
COPY packages/config-eslint ./packages/config-eslint
COPY packages/config-prettier ./packages/config-prettier
COPY packages/config-typescript ./packages/config-typescript
COPY apps/api ./apps/api

RUN test -f packages/contracts/package.json && test -f packages/contracts/src/index.ts
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @chronomint/contracts build
RUN test -d packages/contracts/dist
RUN pnpm --filter @chronomint/api exec prisma generate
RUN pnpm --filter @chronomint/api exec nest build
RUN pnpm --filter @chronomint/api deploy --prod /prod
# pnpm deploy copies contracts source; ensure compiled dist is present at runtime
RUN test -d /prod/node_modules/@chronomint/contracts/dist || \
    cp -r /app/packages/contracts/dist /prod/node_modules/@chronomint/contracts/dist

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /prod/dist ./dist
COPY --from=builder /prod/node_modules ./node_modules
COPY --from=builder /prod/package.json ./package.json
COPY --from=builder /prod/prisma ./prisma

EXPOSE 3001
CMD ["node", "dist/main.js"]
