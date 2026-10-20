// Fixed versioned palette and hash: independent of date, source and render order.
export const EVENT_PALETTE=['#f5dfb3','#d9e7f5','#d7eadc','#e9ddf2','#f3dce5','#d6ecec','#eee3cd','#e3e6c9','#dfdff1','#f3dccb','#d5e8e2','#e8dfd7'];
const known={'early':0,'late':1,'long day':2,'appointment':3,'ces las vegas':4};
export const normaliseTitle=title=>String(title||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-GB');
export const colourKey=title=>'event-title-colour:'+encodeURIComponent(normaliseTitle(title));
export function eventColour(title,entries={}){
 const key=normaliseTitle(title),manual=entries[colourKey(title)];
 if(EVENT_PALETTE.includes(manual))return manual;
 let hash=2166136261;for(const char of key)hash=Math.imul(hash^char.codePointAt(0),16777619);
 return EVENT_PALETTE[known[key]??((hash>>>0)%EVENT_PALETTE.length)];
}
export function setEventColour(entries,title,colour){
 if(!normaliseTitle(title))throw Error('Add a title before choosing a colour.');
 if(colour!==''&&!EVENT_PALETTE.includes(colour))throw Error('Choose a readable palette colour.');
 // Empty string is an explicit reset and can be merged across devices.
 entries[colourKey(title)]=colour;
}
