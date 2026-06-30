async function inflateBuffer(buf) {
  if (!('DecompressionStream' in window)) throw new Error('Browser does not support DecompressionStream');
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function extractTsFromPng(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!sig.every((v, i) => bytes[i] === v)) return arrayBuffer;
  const parts = [];
  let offset = 8;
  const decoder = new TextDecoder();
  while (offset + 12 <= bytes.length) {
    const len = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
    const type = decoder.decode(bytes.slice(offset + 4, offset + 8));
    const dataStart = offset + 8;
    const dataEnd = dataStart + len;
    if (dataEnd + 4 > bytes.length) throw new Error('PNG corrupted');
    if (type === 'iTXt') {
      const data = bytes.slice(dataStart, dataEnd);
      const keywordEnd = data.indexOf(0);
      if (keywordEnd > 0) {
        const keyword = decoder.decode(data.slice(0, keywordEnd));
        if (keyword.startsWith('payload-')) {
          const compressed = data[keywordEnd + 1] === 1;
          let cursor = keywordEnd + 3;
          cursor = data.indexOf(0, cursor) + 1;
          cursor = data.indexOf(0, cursor) + 1;
          const rawText = data.slice(cursor);
          const textBytes = compressed ? await inflateBuffer(rawText) : rawText;
          parts.push({ keyword, value: decoder.decode(textBytes) });
        }
      }
    }
    offset = dataEnd + 4;
  }
  if (!parts.length) return arrayBuffer;
  const binary = atob(parts.sort((a, b) => a.keyword.localeCompare(b.keyword)).map((x) => x.value).join(''));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out.buffer;
}

function getJwPlayerConfig(config) {
  return {
    controls: true,
    autostart: false,
    stretching: 'uniform',
    analytics: { enabled: false },
    ...config,
  };
}

function showPlayerError(message) {
  const root = document.getElementById('player');
  if (!root) return;
  root.innerHTML = `<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#fff;background:#000;font:14px sans-serif;text-align:center;padding:16px">${message}</div>`;
}

function isAllowedPlayerOrigin(origin) {
  const allowed = Array.isArray(window.__ALLOWED_PLAYER_ORIGINS__) ? window.__ALLOWED_PLAYER_ORIGINS__ : [];
  return allowed.includes(origin);
}

let lastPlayRequestKey = '';

function setupJwPlayer(src, title) {
  jwplayer('player').setup(getJwPlayerConfig({
    displaytitle: true,
    abouttext: 'Rổ Phim',
    aboutlink: '/',
    bigPlayButton: true,
    playlist: [{ title, sources: [{ file: src, label: 'HLS', type: 'hls', default: true }] }]
  }));
}

async function rewriteTikTokPlaylistForServiceWorker(src) {
  if (!navigator.serviceWorker) throw new Error('Browser does not support Service Worker');
  const registration = await navigator.serviceWorker.register('/sw-tiktok-hls.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  await registration.update().catch(() => {});
  if (!navigator.serviceWorker.controller) {
    location.reload();
    return null;
  }
  const response = await fetch(src, { credentials: 'omit' });
  if (!response.ok) throw new Error(`Playlist HTTP ${response.status}`);
  const playlistUrl = new URL(src, location.href);
  const body = await response.text();
  const rewritten = body.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const absolute = new URL(trimmed, playlistUrl).toString();
    if (absolute.includes('/sw-hls/segment')) return absolute;
    return `/sw-hls/segment?url=${encodeURIComponent(absolute)}`;
  }).join('\n');
  window.__jwDirectPlaylistText = rewritten;
  return URL.createObjectURL(new Blob([rewritten], { type: 'application/vnd.apple.mpegurl' }));
}

function setupDirectHlsPlayer(src, title) {
  const root = document.getElementById('player');
  root.innerHTML = '<video id="direct-player" controls playsinline style="width:100%;height:100%;background:#000"></video>';
  const video = document.getElementById('direct-player');
  if (!window.Hls || !Hls.isSupported()) {
    video.src = src;
    return true;
  }
  class TikTokPngLoader extends Hls.DefaultConfig.loader {
    load(context, config, callbacks) {
      const stats = {
        aborted: false,
        loaded: 0,
        retry: 0,
        total: 0,
        chunkCount: 0,
        bwEstimate: 0,
        loading: { start: performance.now(), first: 0, end: 0 },
        parsing: { start: 0, end: 0 },
        buffering: { start: 0, first: 0, end: 0 },
      };
      this.controller = new AbortController();
      fetch(context.url, { signal: this.controller.signal, credentials: 'omit', mode: 'cors' })
        .then(async (res) => {
          stats.loading.first = performance.now();
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const isText = context.responseType === 'text' || context.type === 'manifest' || context.type === 'level';
          if (isText) return { data: await res.text(), response: res };
          let mediaResponse = res;
          if (context.url.includes('/api/v1/direct-play/segment-meta')) {
            const meta = await res.json();
            mediaResponse = await fetch(meta.data.url, { credentials: 'omit', mode: 'cors' });
          }
          const data = await extractTsFromPng(await mediaResponse.arrayBuffer());
          return { data, response: res };
        })
        .then(({ data, response }) => {
          stats.loading.end = performance.now();
          stats.loaded = typeof data === 'string' ? data.length : data.byteLength;
          stats.total = stats.loaded;
          callbacks.onSuccess({ url: context.url, data, code: response.status }, stats, context, response);
        })
        .catch((error) => callbacks.onError({ code: 0, text: error.message }, context, null, stats));
    }
    abort() { if (this.controller) this.controller.abort(); }
    destroy() { this.abort(); }
  }
  const hls = new Hls({
    loader: TikTokPngLoader,
    enableWorker: true,            // demux/remux chạy worker -> đỡ giật main thread
    lowLatencyMode: false,
    backBufferLength: 30,          // giữ 30s đã xem để tua lui mượt
    maxBufferLength: 30,           // buffer trước 30s
    maxMaxBufferLength: 60,        // trần buffer 60s khi mạng tốt
    startLevel: -1,                // để ABR tự chọn theo băng thông
    abrEwmaDefaultEstimate: 1000000,
  });
  window.directHls = hls;
  window.directHlsErrors = [];
  hls.attachMedia(video);
  hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(src));
  hls.on(Hls.Events.ERROR, (_, data) => window.directHlsErrors.push(data));
  document.title = title;
  return true;
}

function setupDirectPreviewPlayer() {
  const params = new URLSearchParams(window.location.search);
  const src = params.get('src');
  if (!src) return false;
  const title = params.get('title') || 'Uploaded source preview';
  if (params.get('direct') === '1') return setupDirectHlsPlayer(src, title);
  if (params.get('jw-direct') === '1') {
    rewriteTikTokPlaylistForServiceWorker(src)
      .then((rewrittenSrc) => { if (rewrittenSrc) setupJwPlayer(rewrittenSrc, title); })
      .catch((err) => {
        console.error('JW direct TikTok HLS failed', err);
        document.getElementById('player').innerHTML = `<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#fff;background:#000;font:14px sans-serif">${err.message}</div>`;
      });
    return true;
  }
  setupJwPlayer(src, title);
  return true;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupDirectPreviewPlayer);
else setupDirectPreviewPlayer();

window.addEventListener('message', (event) => {
  if (!isAllowedPlayerOrigin(event.origin)) return;
  const data = event.data;
  if (!data || data.action !== 'play') return;
  const value = data.value;
  if (!value?.t || !value?.ct || !value?.iv) return;
  if (typeof $ === 'undefined' || typeof jwplayer === 'undefined') {
    showPlayerError('Player chưa tải xong, vui lòng thử lại.');
    return;
  }

  const playRequestKey = `${value.t}:${value.ct}:${value.iv}:${value.type || ''}`;
  if (lastPlayRequestKey === playRequestKey) return;
  lastPlayRequestKey = playRequestKey;

  $.ajax({
    url: '/captcha/t',
    type: 'GET',
    dataType: 'json',
    data: { slug: value.t, ct: value.ct, iv: value.iv, type: value.type },
    success: function (payload) {
      if (payload.action === 'captcha') {
        lastPlayRequestKey = '';
        showPlayerError(payload.reason ? `Không tải được nguồn phát: ${payload.reason}` : 'Cần xác thực bảo mật để phát phim.');
        return;
      }
      if (!payload.playlist || !payload.playlist.length) {
        showPlayerError('Không tìm thấy nguồn phát cho tập này.');
        return;
      }
      const playlist = payload.playlist.map((item) => ({
        title: item.title,
        image: item.image,
        sources: item.sources.map((s) => ({ file: `${s.file}?ct=${value.ct}&iv=${value.iv}`, label: s.label, type: 'hls', default: s.default || false }))
      }));
      jwplayer('player').setup(getJwPlayerConfig({ playlist }));
    },
    error: function (xhr) {
      lastPlayRequestKey = '';
      showPlayerError(xhr?.responseJSON?.message || 'Không tải được nguồn phát.');
    }
  });
});
