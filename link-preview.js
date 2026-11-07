import { normaliseShareUrl, shareSource } from './quick-capture.js';

export function videoInfo(value) {
  const safe = normaliseShareUrl(value);
  if (!safe) return { type: 'webpage', platform: '', thumbnailUrl: '' };
  const url = new URL(safe);
  const host = url.hostname.toLowerCase().replace(/^www\./u, '');
  let videoId = '';
  if (host === 'youtu.be') videoId = url.pathname.split('/').filter(Boolean)[0] || '';
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    videoId = url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/u)?.[1] || '';
  }
  if (/^[\w-]{11}$/u.test(videoId)) return { type: 'video', platform: 'YouTube', thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` };
  if (host === 'vimeo.com' || host === 'player.vimeo.com') return { type: 'video', platform: 'Vimeo', thumbnailUrl: '' };
  return { type: 'webpage', platform: shareSource(safe), thumbnailUrl: '' };
}

export async function fetchLinkPreview(value, { fetcher = fetch, timeout = 4500 } = {}) {
  const safe = normaliseShareUrl(value);
  if (!safe) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetcher(`/api/link-preview?url=${encodeURIComponent(safe)}`, { signal: controller.signal, credentials: 'same-origin', headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const data = await response.json();
    const metadataUrl = normaliseShareUrl(data?.url);
    if (!metadataUrl || metadataUrl !== safe) return null;
    const image = normaliseShareUrl(data.image);
    const favicon = normaliseShareUrl(data.favicon);
    const video = videoInfo(safe);
    return {
      url: safe,
      title: String(data.title || '').trim().slice(0, 300),
      description: String(data.description || '').trim().slice(0, 700),
      thumbnailUrl: image || video.thumbnailUrl || '',
      faviconUrl: favicon || '',
      source: video.platform || shareSource(safe),
      contentType: video.type === 'video' || data.contentType === 'video' ? 'video' : 'webpage',
    };
  } catch { return null; }
  finally { clearTimeout(timer); }
}

// Apply one share/capture event to the existing notebook model. The capture ID
// makes a retried event idempotent; matching URLs are deliberately independent.
export function saveCaptureIdea({ notes, entries, capture, makeId, now = new Date().toISOString() }) {
  const url = normaliseShareUrl(capture.sharedUrl);
  const firstLine = String(capture.text || '').trim().split(/\r?\n/u).find(line => line.trim())?.trim().slice(0, 120) || '';
  const title = String(capture.previewMetadata?.title || capture.sharedTitle || firstLine || (url ? shareSource(url) : capture.image ? 'Photo' : 'Quick capture')).slice(0, 300);
  const captureId = String(capture.captureId || '');
  let note = captureId ? notes.find(item => item.quickCaptureId === captureId) : null;
  if (!note) {
    note = { id: makeId(), quickCaptureId: captureId || makeId(), quickCapture: true, quickCaptureInbox: true, idea: true, ideaStatus: 'parked', createdAt: now, title };
    notes.push(note);
  }
  note.quickCapture = true;
  note.quickCaptureInbox = note.quickCaptureInbox !== false;
  note.idea = true;
  note.ideaStatus = note.ideaStatus || 'parked';
  note.title = note.title || title;
  if (url) {
    const video = videoInfo(url);
    note.sharedUrl = url;
    note.source = capture.previewMetadata?.source || video.platform || shareSource(url);
    note.sharedTitle = capture.previewMetadata?.title || capture.sharedTitle || note.sharedTitle || title;
    note.capturedAt = note.capturedAt || now;
    note.previewMetadata = { ...(note.previewMetadata || {}), ...(capture.previewMetadata || {}), source: note.source, title: note.sharedTitle, thumbnailUrl: capture.previewMetadata?.thumbnailUrl || video.thumbnailUrl || note.previewMetadata?.thumbnailUrl || '', contentType: capture.previewMetadata?.contentType || video.type };
    note.contentType = note.previewMetadata.contentType;
    note.quickCaptureId = captureId || note.quickCaptureId;
  } else delete note.sharedUrl;
  const key = `note:${note.id}`;
  if (String(capture.text || '').trim() || entries[key] == null) entries[key] = String(capture.text || '').trim();
  return note;
}
