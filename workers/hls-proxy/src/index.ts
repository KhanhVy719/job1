interface Env {
  ALLOWED_ORIGINS?: string;
  CACHE_PLAYLIST_TTL_SECONDS?: string;
  CACHE_SEGMENT_TTL_SECONDS?: string;
  HLS_PROXY_SECRET: string;
  HLS_PROXY_UA?: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const allowedMethods = new Set(["GET", "HEAD", "OPTIONS"]);

function corsHeaders(request: Request, env: Env): Headers {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigins = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowOrigin = allowedOrigins.includes(origin) ? origin : "*";

  return new Headers({
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Range, Content-Type, Authorization",
    "Access-Control-Expose-Headers":
      "Content-Length, Content-Range, Content-Type, Accept-Ranges",
    "Vary": "Origin",
  });
}

function jsonResponse(
  request: Request,
  env: Env,
  status: number,
  payload: Record<string, unknown>
): Response {
  const headers = corsHeaders(request, env);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(payload), { status, headers });
}

function base64UrlEncodeBytes(value: Uint8Array | ArrayBuffer): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeText(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return decoder.decode(bytes);
}

async function signUrl(url: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(url));
  return base64UrlEncodeBytes(signature);
}

function timingSafeEqual(left: string, right: string): boolean {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  if (leftBytes.length !== rightBytes.length) return false;

  let diff = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    diff |= leftBytes[index] ^ rightBytes[index];
  }
  return diff === 0;
}

function isPlaylistUrl(url: string): boolean {
  try {
    return /\.(m3u8|m3u)$/i.test(new URL(url).pathname);
  } catch {
    return /\.(m3u8|m3u)(?:$|[?#])/i.test(url);
  }
}

function isPlaylistResponse(targetUrl: string, upstream: Response): boolean {
  const contentType = upstream.headers.get("Content-Type") || "";
  return isPlaylistUrl(targetUrl) || /mpegurl|application\/vnd\.apple\.mpegurl/i.test(contentType);
}

function proxyEndpoint(request: Request): string {
  const url = new URL(request.url);
  return `${url.origin}${url.pathname}`;
}

async function buildProxyUrl(endpoint: string, targetUrl: string, env: Env): Promise<string> {
  const encoded = base64UrlEncodeBytes(encoder.encode(targetUrl));
  const signature = await signUrl(targetUrl, env.HLS_PROXY_SECRET);
  const url = new URL(endpoint);
  url.searchParams.set("u", encoded);
  url.searchParams.set("s", signature);
  return url.toString();
}

async function rewritePlaylist(
  playlist: string,
  playlistUrl: string,
  endpoint: string,
  env: Env
): Promise<string> {
  const lines = playlist.split(/\r?\n/);
  const rewritten: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      rewritten.push(line);
      continue;
    }

    if (trimmed.startsWith("#")) {
      const keyMatch = line.match(/URI="([^"]+)"/);
      if (!keyMatch) {
        rewritten.push(line);
        continue;
      }

      try {
        const absolute = new URL(keyMatch[1], playlistUrl).toString();
        const proxied = await buildProxyUrl(endpoint, absolute, env);
        rewritten.push(line.replace(keyMatch[0], `URI="${proxied}"`));
      } catch {
        rewritten.push(line);
      }
      continue;
    }

    try {
      const absolute = new URL(trimmed, playlistUrl).toString();
      rewritten.push(await buildProxyUrl(endpoint, absolute, env));
    } catch {
      rewritten.push(line);
    }
  }

  return rewritten.join("\n");
}

function copyPassthroughHeaders(upstream: Response, request: Request, env: Env): Headers {
  const headers = corsHeaders(request, env);
  const passthrough = [
    "Accept-Ranges",
    "Cache-Control",
    "Content-Length",
    "Content-Range",
    "Content-Type",
    "ETag",
    "Last-Modified",
  ];

  for (const header of passthrough) {
    const value = upstream.headers.get(header);
    if (value) headers.set(header, value);
  }

  return headers;
}

function numericEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

async function handleProxy(request: Request, env: Env): Promise<Response> {
  if (!allowedMethods.has(request.method)) {
    return jsonResponse(request, env, 405, { status: false, message: "method not allowed" });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }

  const requestUrl = new URL(request.url);
  const encodedUrl = requestUrl.searchParams.get("u") || "";
  const signature = requestUrl.searchParams.get("s") || "";

  if (!encodedUrl || !signature) {
    return jsonResponse(request, env, 400, { status: false, message: "missing proxy params" });
  }

  let targetUrl = "";
  try {
    targetUrl = base64UrlDecodeText(encodedUrl);
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== "https:") throw new Error("invalid protocol");
  } catch {
    return jsonResponse(request, env, 400, { status: false, message: "invalid proxy url" });
  }

  const expectedSignature = await signUrl(targetUrl, env.HLS_PROXY_SECRET);
  if (!timingSafeEqual(signature, expectedSignature)) {
    return jsonResponse(request, env, 403, { status: false, message: "invalid proxy signature" });
  }

  const upstreamHeaders = new Headers({
    "Accept": "*/*",
    "User-Agent": env.HLS_PROXY_UA || "Mozilla/5.0",
  });
  const range = request.headers.get("Range");
  if (range) upstreamHeaders.set("Range", range);

  const cacheTtl = isPlaylistUrl(targetUrl)
    ? numericEnv(env.CACHE_PLAYLIST_TTL_SECONDS, 20)
    : numericEnv(env.CACHE_SEGMENT_TTL_SECONDS, 86_400);

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers: upstreamHeaders,
    redirect: "follow",
    cf: request.method === "GET" && !range
      ? { cacheEverything: true, cacheTtl }
      : undefined,
  });

  if (request.method === "HEAD" || !isPlaylistResponse(targetUrl, upstream)) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: copyPassthroughHeaders(upstream, request, env),
    });
  }

  const playlist = await upstream.text();
  const rewritten = await rewritePlaylist(playlist, targetUrl, proxyEndpoint(request), env);
  const headers = corsHeaders(request, env);
  headers.set("Content-Type", "application/vnd.apple.mpegurl");
  headers.set("Cache-Control", `public, max-age=${numericEnv(env.CACHE_PLAYLIST_TTL_SECONDS, 20)}`);

  return new Response(rewritten, {
    status: upstream.status,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleProxy(request, env);
    } catch (error) {
      console.error(JSON.stringify({
        event: "hls_proxy_error",
        message: error instanceof Error ? error.message : String(error),
      }));
      return jsonResponse(request, env, 502, { status: false, message: "hls proxy error" });
    }
  },
};
