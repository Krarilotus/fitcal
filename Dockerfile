FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

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

USER fitcal
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push && npm run start"]
