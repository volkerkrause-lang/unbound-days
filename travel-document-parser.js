const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const labelValue = (text, labels) => {
  const names = labels.join('|');
  const match = text.match(new RegExp(`(?:^|\\n)\\s*(?:${names})\\s*[:#-]\\s*([^\\n]{2,100})`, 'i'));
  return match ? clean(match[1]) : '';
};
const dateValue = value => {
  if (!value) return '';
  let match = value.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  match = value.match(/\b(\d{1,2})[/. -](\d{1,2})[/. -](\d{2,4})\b/);
  if (match) {
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }
  const named = value.match(/\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\w*[, ]+((?:20)?\d{2})\b/i);
  if (!named) return '';
  const month = new Date(`${named[2]} 1 2000`).getMonth() + 1;
  const year = named[3].length === 2 ? `20${named[3]}` : named[3];
  return `${year}-${String(month).padStart(2, '0')}-${named[1].padStart(2, '0')}`;
};

export function parseBookingText(rawText) {
  const text = String(rawText || '').replace(/\r/g, '\n');
  const lower = text.toLowerCase();
  let type = '';
  if (/\b(flight|airline|boarding pass|departure airport|arrival airport)\b/i.test(text)) type = 'Flight';
  else if (/\b(train|railway|rail ticket|platform|departure station)\b/i.test(text)) type = 'Train';
  else if (/\b(hotel|accommodation|check.?in|check.?out|guest room)\b/i.test(text)) type = 'Accommodation';
  else if (/\b(car hire|car rental|vehicle rental)\b/i.test(text)) type = 'Car hire';
  else if (/\b(restaurant|table reservation|dining reservation)\b/i.test(text)) type = 'Restaurant';
  else if (/\b(taxi|transfer|ground transport|pickup)\b/i.test(text)) type = 'Transport';
  else if (/\b(excursion|tour|guided visit)\b/i.test(text)) type = /\bexcursion\b/i.test(text) ? 'Excursion' : 'Tour';
  else if (/\b(event|admission|ticket|venue|doors open)\b/i.test(text)) type = 'Event';

  const reference = labelValue(text, ['booking reference', 'reservation reference', 'confirmation number', 'booking number', 'booking code', 'PNR', 'reference']);
  const dates = [...text.matchAll(/\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[/. -]\d{1,2}[/. -]\d{2,4}|\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\w*[, ]+\d{2,4})\b/gi)].map(x => dateValue(x[0])).filter(Boolean);
  const times = [...text.matchAll(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g)].map(x => x[0]);
  const fields = { type, reference };
  if (type === 'Flight' || type === 'Train' || type === 'Transport') {
    fields.departureLocation = labelValue(text, ['departure airport', 'departure station', 'from', 'origin', 'departing from']);
    fields.arrivalLocation = labelValue(text, ['arrival airport', 'arrival station', 'to', 'destination', 'arriving at']);
    if (!fields.departureLocation || !fields.arrivalLocation) {
      const route = text.match(/\bfrom\s+([^\n,;]{2,60})\s+to\s+([^\n,;]{2,60})/i);
      if (route) { fields.departureLocation ||= clean(route[1]); fields.arrivalLocation ||= clean(route[2]); }
    }
    fields.name = type === 'Flight' ? labelValue(text, ['airline', 'carrier']) : labelValue(text, ['operator', 'rail operator', 'carrier']);
    const flightNo = text.match(/(?:flight\s*(?:number|no\.?|#)?|flight)\s*[:#-]?\s*([A-Z]{2}\s?\d{1,4})\b/i) || text.match(/\b([A-Z]{2}\s?\d{1,4})\b/);
    if (type === 'Flight' && flightNo) fields.flightNumber = clean(flightNo[1]);
    if (type === 'Train') fields.trainNumber = labelValue(text, ['train number', 'service number', 'train no\.?']);
    if (dates[0]) fields.date = dates[0];
    if (dates[1]) fields.endDate = dates[1];
    if (times[0]) fields.time = times[0];
    if (times[1]) fields.endTime = times[1];
  } else if (type === 'Accommodation') {
    fields.name = labelValue(text, ['hotel', 'property', 'accommodation', 'property name']);
    fields.location = labelValue(text, ['address', 'property address', 'location']);
    fields.date = dateValue(labelValue(text, ['check.?in', 'arrival date'])) || dates[0] || '';
    fields.endDate = dateValue(labelValue(text, ['check.?out', 'departure date'])) || dates[1] || '';
  } else {
    fields.name = labelValue(text, ['venue', 'restaurant', 'provider', 'company', 'event', 'tour', 'excursion', 'pickup location']);
    fields.location = labelValue(text, ['address', 'meeting point', 'venue address', 'location']);
    if (dates[0]) fields.date = dates[0];
    if (times[0]) fields.time = times[0];
    if (times[1]) fields.endTime = times[1];
  }
  fields.name ||= '';
  fields.location ||= '';
  fields.reference ||= '';
  return { type, fields, textLength: text.trim().length, multiSegmentHint: type === 'Flight' && (text.match(/\bflight\s*(?:(?:number|no\.?|#)\s*)?[:#-]?\s*[A-Z]{2}\s?\d{1,4}\b/gi) || []).length > 1 };
}

export function parseDistinctBookingPages(pages) {
  const candidates = pages.map(page => parseBookingText(page.text)).filter(result => result.type && result.textLength > 45);
  const seen = new Set();
  return candidates.filter(result => {
    const f = result.fields;
    const key = f.reference ? `${result.type}:${f.reference.toLowerCase()}` : `${result.type}:${f.date}:${f.name}:${f.departureLocation}:${f.arrivalLocation}:${f.location}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

