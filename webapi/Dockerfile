# rophim-webapi — Express API (/api/v1) + ffmpeg/ffprobe + multer
FROM node:20-slim

ENV NODE_ENV=production
WORKDIR /app

# ffmpeg/ffprobe required by TiktokService; build tools for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci
# tsx is invoked via `npx tsx` in start script but not declared — pin it
RUN npm install --no-save tsx

COPY . .

# Bind to all interfaces inside the container (URL is only used for host binding)
ENV URL=0.0.0.0
ENV PORT=8001
EXPOSE 8001

CMD ["npm", "run", "start"]
