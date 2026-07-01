# tungmmo (server) — Express + Socket.io + crawler + ffmpeg/ffprobe
FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg aria2 python3 make g++ ca-certificates openssh-client sshpass \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --include=dev
RUN npm install --no-save tsx
ENV NODE_ENV=production

COPY . .

# webpack build for client-side bundle served by the app
RUN npm run build || echo "webpack build skipped"

ENV URL=0.0.0.0
ENV PORT=8001
EXPOSE 8001

CMD ["npm", "run", "start"]
