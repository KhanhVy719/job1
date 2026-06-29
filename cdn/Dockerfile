# tungmmo (cdn) — Express + HLS streaming + Socket.io + ffmpeg/ffprobe
FROM node:20-slim

ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci
RUN npm install --no-save tsx

COPY . .

RUN npm run build || echo "webpack build skipped"

ENV URL=0.0.0.0
ENV PORT=8001
EXPOSE 8001

CMD ["npm", "run", "start"]
