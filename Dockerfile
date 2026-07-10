FROM node:22-alpine AS deps
WORKDIR /app
ENV NPM_CONFIG_AUDIT=false \
  NPM_CONFIG_FUND=false \
  NPM_CONFIG_UPDATE_NOTIFIER=false \
  PRISMA_HIDE_UPDATE_MESSAGE=true
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY scripts ./scripts
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
  NPM_CONFIG_UPDATE_NOTIFIER=false \
  PRISMA_HIDE_UPDATE_MESSAGE=true
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
  NODE_ENV=production \
  NPM_CONFIG_UPDATE_NOTIFIER=false \
  PORT=3000 \
  PRISMA_HIDE_UPDATE_MESSAGE=true

# Create least-privileged runtime user and persistent data paths.
RUN addgroup -S fitcal -g 10001 \
  && adduser -S fitcal -u 10001 -G fitcal \
  && mkdir -p /app/data /app/uploads \
  && chown -R fitcal:fitcal /app

COPY --from=builder --chown=fitcal:fitcal /app/.next ./.next
COPY --from=builder --chown=fitcal:fitcal /app/public ./public
COPY --from=builder --chown=fitcal:fitcal /app/package.json ./package.json
COPY --from=builder --chown=fitcal:fitcal /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=fitcal:fitcal /app/node_modules ./node_modules
COPY --from=builder --chown=fitcal:fitcal /app/prisma ./prisma
COPY --from=builder --chown=fitcal:fitcal /app/scripts ./scripts

USER fitcal
EXPOSE 3000
CMD ["npm", "run", "start"]
