const DAY_KEYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'');
export function isScheduled(ritual,date){
 if(!ritual||!validDate(date)||validDate(ritual.startDate)&&date<ritual.startDate)return false;
 const day=(new Date(`${date}T12:00:00`).getDay()+6)%7;
 if(ritual.frequency==='weekdays')return day<5;
 if(ritual.frequency==='weekends')return day>=5;
 if(ritual.frequency==='custom')return Array.isArray(ritual.days)&&ritual.days.includes(day);
 return true;
}
export function rangeDates(start,end){const dates=[];for(let d=new Date(`${start}T12:00:00`),last=new Date(`${end}T12:00:00`);d<=last;d.setDate(d.getDate()+1))dates.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);return dates;}
export function ritualProgress(ritual,start,end){
 const scheduled=rangeDates(start,end).filter(d=>isScheduled(ritual,d));
 const completed=scheduled.filter(d=>isComplete(ritual,d));
 return {scheduled:scheduled.length,completed:completed.length,percent:scheduled.length?Math.round(completed.length/scheduled.length*100):0,dates:scheduled};
}
export function currentStreak(ritual,today){
 const previous=day=>{const d=new Date(`${day}T12:00:00`);d.setDate(d.getDate()-1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 let end=isComplete(ritual,today)?today:previous(today);
 let streak=0;
 for(let d=end;validDate(d);d=previous(d)){
  if(validDate(ritual.startDate)&&d<ritual.startDate)break;
  if(!isScheduled(ritual,d))continue;
  if(!isComplete(ritual,d))break;
  streak++;
 }
 return streak;
}
export function isComplete(ritual,date){
 const change=ritual?.completionChanges?.[date];
 return change&&typeof change==='object'?change.done===true:(ritual?.checks||[]).includes(date);
}
export function toggleCompletion(ritual,date,updatedAt=new Date().toISOString(),deviceId=''){
 if(!isScheduled(ritual,date))return false;
 const done=!isComplete(ritual,date),checks=ritual.checks||[];
 ritual.checks=done?[...new Set([...checks,date])].sort():checks.filter(d=>d!==date);
 ritual.completionChanges={...(ritual.completionChanges||{}),[date]:{done,updatedAt,deviceId}};
 return true;
}
export const weekdayLabels=DAY_KEYS;
