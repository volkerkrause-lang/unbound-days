export const pad=n=>String(n).padStart(2,'0');
export const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const parseDate=s=>new Date(Number(s.slice(0,4)),Number(s.slice(5,7))-1,Number(s.slice(8,10)),12);
export const addDays=(s,n)=>{const d=parseDate(s);d.setDate(d.getDate()+n);return dateKey(d);};
export const monday=s=>{const d=parseDate(s);return addDays(s,-((d.getDay()+6)%7));};
export function isoWeek(s){const d=parseDate(s);const u=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));u.setUTCDate(u.getUTCDate()+4-(u.getUTCDay()||7));const year=u.getUTCFullYear();return {year,week:Math.ceil((((u-new Date(Date.UTC(year,0,1)))/86400000)+1)/7)};}
export function monthCells(year,month){const first=`${year}-${pad(month+1)}-01`,start=monday(first);return Array.from({length:42},(_,i)=>addDays(start,i));}
export function eventOnDate(event,date){
  if(event.deleted||date<event.date)return false;
  if(event.until&&date>event.until)return false;
  if(event.exdates?.includes(date))return false;
  if(!event.repeat||event.repeat==='none')return date>=event.date&&date<=(event.lastDate||event.date);
  const a=parseDate(event.date),b=parseDate(date);
  if(event.repeat==='daily')return true;
  if(event.repeat==='weekly')return a.getDay()===b.getDay();
  if(event.repeat==='monthly')return a.getDate()===b.getDate();
  if(event.repeat==='yearly')return a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
  return false;
}
export const formatDate=(date,opts={})=>parseDate(date).toLocaleDateString('en-GB',opts);
export function escapeICS(s=''){return String(s).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');}
export function toICS(events){const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Unbound//Planner//EN','CALSCALE:GREGORIAN'];for(const e of events.filter(e=>!e.deleted&&!e.google)){lines.push('BEGIN:VEVENT',`UID:${e.id}@unbound.local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`);const day=e.date.replace(/-/g,'');if(!e.time){lines.push(`DTSTART;VALUE=DATE:${day}`,`DTEND;VALUE=DATE:${addDays(e.lastDate||e.date,1).replace(/-/g,'')}`);}else{lines.push(`DTSTART:${day}T${e.time.replace(':','')}00`,`DTEND:${(e.endDate||e.date).replace(/-/g,'')}T${(e.endTime||e.time).replace(':','')}00`);}lines.push(`SUMMARY:${escapeICS(e.title)}`);if(e.notes)lines.push(`DESCRIPTION:${escapeICS(e.notes)}`);if(e.location)lines.push(`LOCATION:${escapeICS(e.location)}`);if(e.repeat&&e.repeat!=='none')lines.push(`RRULE:FREQ=${e.repeat.toUpperCase()}`);if(e.reminder!==''&&e.reminder!=null){lines.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Reminder',`TRIGGER:-PT${Number(e.reminder)}M`,'END:VALARM');}lines.push('END:VEVENT');}lines.push('END:VCALENDAR');return lines.join('\r\n');}
