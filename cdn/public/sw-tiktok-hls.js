async function inflateBuffer(buf) {
  if (!('DecompressionStream' in self)) throw new Error('DecompressionStream is not supported');
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

self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname !== '/sw-hls/segment') return;

  event.respondWith((async () => {
    const source = url.searchParams.get('url');
    if (!source) return new Response('Missing segment url', { status: 400 });
    const response = await fetch(source, { credentials: 'omit', mode: 'cors' });
    if (!response.ok) return new Response('TikTok segment fetch failed', { status: response.status });
    const ts = await extractTsFromPng(await response.arrayBuffer());
    return new Response(ts, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp2t',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*'
      }
    });
  })());
});
