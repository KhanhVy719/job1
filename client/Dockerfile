# rophim-client — Next.js (Pages Router) + custom Express server (tsx)
FROM node:20-slim

ENV NODE_ENV=production
WORKDIR /app

# System libs for native modules (bcrypt, sharp, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install deps (includes devDeps: tsx + next needed for build/runtime)
COPY package.json package-lock.json ./
RUN npm ci

# App source
COPY . .

# Build Next.js (postbuild runs next-sitemap)
RUN npm run build

ENV PORT=3000
EXPOSE 3000

# Custom server started via tsx
CMD ["npm", "run", "start"]
