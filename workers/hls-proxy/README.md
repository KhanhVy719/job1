# RoPhim HLS Proxy Worker

This Worker moves VSEmbed/HLS proxy bandwidth from the VPS to Cloudflare. The VPS still resolves metadata and signs target URLs, but playlist and segment traffic goes directly through Cloudflare Workers.

## Deploy

```bash
cd workers/hls-proxy
wrangler login
wrangler secret put HLS_PROXY_SECRET
wrangler deploy
```

Use the same `HLS_PROXY_SECRET` value in `webapi/.env` on the VPS.

After the Worker is deployed, enable it on the VPS:

```bash
cd /home/ubuntu/rophim
printf '\nHLS_PROXY_PUBLIC_URL=https://hls-proxy.peakfilm.net/api/v1/hls-proxy\n' >> webapi/.env
docker compose up -d webapi
```

Do not set `HLS_PROXY_PUBLIC_URL` until the Worker custom domain is live, otherwise playback will fail.
