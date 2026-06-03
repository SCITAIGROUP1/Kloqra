FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
# Root devDependencies (config-eslint, config-prettier) must exist for pnpm deploy workspace resolution
COPY packages/config-eslint packages/config-prettier packages/config-typescript packages/contracts ./packages/
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @chronomint/contracts build
RUN pnpm --filter @chronomint/api prisma:generate
RUN pnpm --filter @chronomint/api build
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
