FROM node:20-alpine3.20 AS builder
WORKDIR /app
# Prisma query engine on Alpine needs OpenSSL; 3.20 avoids libssl path regressions on 3.21+
RUN apk add --no-cache openssl libc6-compat
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
RUN pnpm --filter @kloqra/contracts build
RUN test -d packages/contracts/dist
RUN pnpm --filter @kloqra/api exec prisma generate
RUN pnpm --filter @kloqra/api exec nest build
RUN pnpm --filter @kloqra/api deploy --prod /prod
# pnpm deploy copies contracts source; ensure compiled dist is present at runtime
RUN test -d /prod/node_modules/@kloqra/contracts/dist || \
    cp -r /app/packages/contracts/dist /prod/node_modules/@kloqra/contracts/dist
# pnpm deploy skips postinstall — generate Prisma Client inside /prod (not the monorepo tree)
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
RUN pnpm --filter @kloqra/api exec prisma generate --schema=/prod/prisma/schema.prisma && \
    test -n "$(find /prod/node_modules -name 'libquery_engine-linux-musl*.so.node' -print -quit)"

FROM node:20-alpine3.20 AS runner
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
ENV NODE_ENV=production

COPY --chown=node:node --from=builder /prod/dist ./dist
COPY --chown=node:node --from=builder /prod/node_modules ./node_modules
COPY --chown=node:node --from=builder /prod/package.json ./package.json
COPY --chown=node:node --from=builder /prod/prisma ./prisma
COPY --chown=node:node apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD node -e "require('http').get('http://localhost:3001/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["./docker-entrypoint.sh"]
