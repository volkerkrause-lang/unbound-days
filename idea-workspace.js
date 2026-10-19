const clamp = value => Math.max(0, Math.min(1, value));

export function normaliseStroke(stroke = {}) {
  const tool = ['pen', 'pencil', 'highlighter', 'eraser'].includes(stroke.tool) ? stroke.tool : 'pen';
  return {
    tool,
    color: stroke.color || '#313a41',
    size: Number(stroke.size) || (tool === 'highlighter' ? 16 : tool === 'eraser' ? 22 : 3),
    opacity: Number.isFinite(Number(stroke.opacity)) ? Number(stroke.opacity) : tool === 'highlighter' ? .3 : tool === 'pencil' ? .72 : 1,
    points: Array.isArray(stroke.points) ? stroke.points.map(point => ({x:clamp(Number(point.x)||0), y:clamp(Number(point.y)||0), p:Number(point.p)||.5})) : [],
  };
}

export function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    const crosses = (a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / ((b.y - a.y) || Number.EPSILON) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function selectedStrokeIndexes(strokes, polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return [];
  return strokes.map((stroke, index) => normaliseStroke(stroke).points.some(point => pointInPolygon(point, polygon)) ? index : -1).filter(index => index >= 0);
}

export function selectionBounds(strokes, indexes) {
  const points = indexes.flatMap(index => normaliseStroke(strokes[index]).points);
  if (!points.length) return null;
  const xs = points.map(point => point.x), ys = points.map(point => point.y);
  return {left:Math.min(...xs), top:Math.min(...ys), right:Math.max(...xs), bottom:Math.max(...ys)};
}

export function moveStrokes(strokes, indexes, dx, dy) {
  const selected = new Set(indexes);
  return strokes.map((stroke, index) => selected.has(index) ? {...normaliseStroke(stroke), points:normaliseStroke(stroke).points.map(point => ({...point,x:clamp(point.x+dx),y:clamp(point.y+dy)}))} : normaliseStroke(stroke));
}

export function scaleStrokes(strokes, indexes, factor) {
  const bounds = selectionBounds(strokes, indexes);
  if (!bounds || !Number.isFinite(factor) || factor <= 0) return strokes.map(normaliseStroke);
  const selected = new Set(indexes), cx=(bounds.left+bounds.right)/2, cy=(bounds.top+bounds.bottom)/2;
  return strokes.map((stroke, index) => selected.has(index) ? {...normaliseStroke(stroke), points:normaliseStroke(stroke).points.map(point => ({...point,x:clamp(cx+(point.x-cx)*factor),y:clamp(cy+(point.y-cy)*factor)}))} : normaliseStroke(stroke));
}

export function eraseWholeStrokes(strokes, point, radius = .025) {
  return strokes.filter(stroke => normaliseStroke(stroke).tool === 'eraser' || !normaliseStroke(stroke).points.some(candidate => Math.hypot(candidate.x-point.x,candidate.y-point.y) <= radius)).map(normaliseStroke);
}

export function paperEntry(noteId, suffix = 'paper') {
  return `idea:${noteId}:${suffix}`;
}
