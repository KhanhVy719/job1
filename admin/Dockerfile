# rophim-admin — Next.js + custom http server + Socket.io (ts-node)
FROM node:20-slim

ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

ENV PORT=3001
EXPOSE 3001

# Custom server started via ts-node
CMD ["npm", "run", "start"]
