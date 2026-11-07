const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 3500;
const MAX_REDIRECTS = 3;

export function isPublicIp(host) {
  const h = host.toLowerCase().replace(/^\[|\]$/gu, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.home') || h.endsWith('.lan') || h.endsWith('.test') || h.endsWith('.invalid') || h.endsWith('.onion') || (!h.includes(':') && !/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(h) && !h.includes('.'))) return false;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(h)) {
    const a = h.split('.').map(Number);
    const privateRange = a[0] === 0 || a[0] === 10 || a[0] === 127 || a[0] >= 224 ||
      (a[0] === 100 && a[1] >= 64 && a[1] <= 127) ||
      (a[0] === 169 && a[1] === 254) ||
      (a[0] === 172 && a[1] >= 16 && a[1] <= 31) ||
      (a[0] === 192 && (a[1] === 168 || (a[1] === 0 && (a[2] === 0 || a[2] === 2)) || (a[1] === 88 && a[2] === 99))) ||
      (a[0] === 198 && (a[1] === 18 || a[1] === 19 || (a[1] === 51 && a[2] === 100))) ||
      (a[0] === 203 && a[1] === 0 && a[2] === 113);
    if (a.some(x => x > 255) || privateRange) return false;
  }
  if (h.includes(':')) {
    const v = h.toLowerCase();
    const first = Number.parseInt(v.replace(/^\[/u,'').split(':')[0] || '0', 16);
    if ((first & 0xe000) !== 0x2000 || v === '::' || v === '::1' || /^2001:db8:/u.test(v) || /^f[cd]/u.test(v) || /^fe[89ab]/u.test(v) || /^ff/u.test(v) || /^::ffff:/u.test(v)) return false;
  }
  return true;
}
function safeUrl(value) {
  try {
    const u = new URL(value);
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || !isPublicIp(u.hostname)) return null;
    if (u.port && !['80', '443'].includes(u.port)) return null;
    u.hash = '';
    return u;
  } catch { return null; }
}
function decode(value) {
  return String(value || '').replace(/&(?:amp|#38);/giu, '&').replace(/&(?:quot|#34);/giu, '"').replace(/&#39;|&apos;/giu, "'").replace(/&lt;/giu, '<').replace(/&gt;/giu, '>').replace(/&#(\d+);/gu, (_, n) => String.fromCodePoint(Math.min(0x10ffff, Number(n)))).replace(/&#x([\da-f]+);/giu, (_, n) => String.fromCodePoint(Math.min(0x10ffff, parseInt(n, 16)))).replace(/\s+/gu, ' ').trim();
}
function attributes(tag) {
  const out = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gu)) out[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4]);
  return out;
}
export function parseMetadata(html, finalUrl) {
  const meta = {};
  let icon = '';
  for (const match of html.matchAll(/<(meta|title|link)\b[^>]*>/giu)) {
    const tag = match[0];
    if (match[1].toLowerCase() === 'meta') {
      const a = attributes(tag), key = (a.property || a.name || '').toLowerCase(), value = a.content || '';
      if (value && !meta[key]) meta[key] = value;
    } else if (match[1].toLowerCase() === 'title' && !meta.title) meta.title = decode(tag.replace(/^<title\b[^>]*>|<\/title>$/giu, '').replace(/<[^>]*>/gu, ''));
    else if (match[1].toLowerCase() === 'link') {
      const a = attributes(tag);
      if (!icon && /(?:^|\s)(?:icon|shortcut icon)(?:\s|$)/iu.test(a.rel || '') && a.href) icon = a.href;
    }
  }
  const absolute = value => { try { const safe=safeUrl(new URL(value, finalUrl).href); return safe?.href || ''; } catch { return ''; } };
  const docTitle=html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/iu)?.[1]?.replace(/<[^>]*>/gu,'')||'';
  return {
    title: meta['og:title'] || meta['twitter:title'] || meta.title || decode(docTitle),
    description: meta['og:description'] || meta['twitter:description'] || meta.description || '',
    image: absolute(meta['og:image'] || meta['og:image:url'] || meta['twitter:image'] || meta['twitter:image:src'] || ''),
    favicon: absolute(icon || '/favicon.ico'),
    contentType: /video/iu.test(meta['og:type'] || '') || /video/iu.test(meta['twitter:card'] || '') ? 'video' : 'webpage',
  };
}
async function isPublicTarget(url, signal) {
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(url.hostname) || url.hostname.includes(':')) return isPublicIp(url.hostname);
  const addresses = [];
  for (const type of ['A', 'AAAA']) {
    try {
      const dns = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(url.hostname)}&type=${type}`, { headers: { Accept: 'application/dns-json' }, signal });
      if (!dns.ok) return false;
      const result = await dns.json();
      if (result.Status !== 0) return false;
      addresses.push(...(result.Answer || []).filter(answer => answer.type === (type === 'A' ? 1 : 28)).map(answer => answer.data));
    } catch { return false; }
  }
  return addresses.length > 0 && addresses.every(isPublicIp);
}
async function readLimited(response) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); break; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(Math.min(size, MAX_BYTES)); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}
export async function onRequestGet({ request }) {
  const incoming = new URL(request.url).searchParams.get('url');
  let target = safeUrl(incoming);
  if (!target) return Response.json({ error: 'invalid_url' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  const abort = new AbortController(), timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
      if (!target || !await isPublicTarget(target, abort.signal)) return Response.json({ error: 'blocked_host' }, { status: 400 });
      const response = await fetch(target.href, { redirect: 'manual', signal: abort.signal, headers: { Accept: 'text/html,application/xhtml+xml;q=0.9', 'User-Agent': 'UnboundLinkPreview/1.0' } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        if (redirects === MAX_REDIRECTS) return Response.json({ error: 'too_many_redirects' }, { status: 502 });
        const location = response.headers.get('location');
        target = location ? safeUrl(new URL(location, target).href) : null;
        if (!target) return Response.json({ error: 'blocked_redirect' }, { status: 502 });
        continue;
      }
      if (!response.ok || !/^(?:text\/html|application\/xhtml\+xml)/iu.test(response.headers.get('content-type') || '')) return Response.json({ error: 'unavailable' }, { status: 502 });
      const html = await readLimited(response);
      const result = parseMetadata(html, target.href);
      return Response.json({ url: incoming, ...result }, { headers: { 'Cache-Control': 'public, max-age=3600', 'Content-Type': 'application/json; charset=utf-8' } });
    }
  } catch { return Response.json({ error: 'unavailable' }, { status: 502 }); }
  finally { clearTimeout(timer); }
}
