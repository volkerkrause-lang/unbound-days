/* Packing fields remain ordinary string entries, so recovery and cloud merging
   work per item without changing the notebook's version-one backup format. */
export const packingGroups=[
 ['clothes','Clothes',['Underwear','Socks','Trousers','T-shirts','Shirts','Pullover','Jacket','Hat','Pyjamas','Shoes','Belt']],
 ['cold','Cold-weather extras',['Warm coat','Gloves','Scarf','Thermal layers','Warm socks','Winter footwear']],
 ['wash','Wash bag',['Wash bag','Electric toothbrush','Toothbrush charger','Toothpaste','Dental floss','Shaving equipment','Shaver charger','Shaving cream','Hairbrush','Shampoo','Conditioner','Hair gel','Leave-in conditioner','Deodorant']],
 ['carry','Carry essentials',['Passport / ID','Keys','Credit / debit cards','Mobile phone','Glasses','Sunglasses']],
 ['tech','Devices & chargers',['Mobile phone charger','iPad','iPad charger','Meta glasses','Meta glasses charger','Headphones','Power bank','Charging cables','Travel adapters']],
 ['papers','Travel documents',['Flight tickets / boarding passes','Hotel confirmations / receipts','Travel insurance details','Transfer confirmations','Car-hire confirmation','Visa / entry documents']],
 ['health','Health & personal extras',['Regular medicines','Personal health supplies']],
 ['activity','Activities & equipment',['Swimwear','Day bag','Cello','Bow','Rosin','Sheet music']],
 ['food','Food & drink',['Water bottle','Travel snacks']]
];
export const departureGroups=[
 ['prepare','Get ready',['Arrange taxi / transport to the airport','Arrange arrival taxi / pickup','Record pickup times, meeting points and booking references','Check roaming at the destination','Arrange holiday SIM / eSIM if needed','Download offline maps','Download tickets and booking documents','Download films to the iPad','Test films and documents offline','Charge devices and power bank','Check travel adapters','Replenish toiletries','Arrange enough medicines','Arrange key handover / deposit']],
 ['day','Departure day',['Check travel updates and flight times','Pack last-minute items and chargers','Collect passport, cards and medicines','Take out rubbish','Check transport pickup arrangements']],
 ['door','At the door',['Close windows','Check oven and hob are off','Switch off lights','Check taps are off','Deposit / hand over keys as arranged','Lock doors']]
];
const optional=new Set(['cold','activity','food']);
const optionalNames=new Set(['Sunglasses','Meta glasses','Meta glasses charger','Car-hire confirmation','Visa / entry documents','Personal health supplies','Arrange holiday SIM / eSIM if needed','Shaver charger','Hair gel','Leave-in conditioner']);
const lastNames=new Set(['Keys','Mobile phone','Glasses','Electric toothbrush','Mobile phone charger','iPad','iPad charger']);
/* Shared optional item catalogue and icon-led activity suggestions. Existing item IDs remain unchanged. */
export const packingLibraryGroups=[["beach","Beach & swimming",["Swimming costume / trunks","Cover-up","Beach towel","Goggles","Flip-flops","Sun cream","After-sun lotion","Waterproof phone pouch","Beach bag","Wide-brimmed hat"]],["outdoors","Hiking & outdoors",["Walking boots","Walking socks","Waterproof jacket","Waterproof trousers","Daypack","Walking poles","Map or GPS","Reusable water bottle","Insect repellent","Blister plasters","Torch"]],["winter","Skiing & winter sports",["Ski jacket","Ski trousers","Thermal base layers","Ski gloves","Goggles","Neck warmer","Helmet","Ski pass","Hand warmers"]],["camping","Camping",["Tent","Tent pegs","Sleeping bag","Sleeping mat","Pillow","Head torch","Camping stove","Fuel","Matches or lighter","Camping cookware","Camping cutlery","First-aid kit"]],["business","Business & mobile office",["Laptop","Laptop charger","Mouse","Notebook","Pens","Work ID","Presentation adaptor","Headset","Portable keyboard","Power bank"]],["photography","Photography",["Camera","Camera case","Camera lenses","Memory cards","Camera batteries","Battery charger","Tripod","Cleaning cloth","Card reader"]],["sports","Fitness & sports",["Sportswear","Trainers","Gym shoes","Exercise bands","Sports watch","Sports towel","Water bottle","Protein snacks"]],["children","Baby & children",["Nappies","Nappy bags","Baby wipes","Changing mat","Baby clothes","Child spare clothes","Baby carrier","Pushchair","Favourite toy","Child car seat","Bottles","Formula or baby food"]],["pets","Dog & pet travel",["Lead","Harness","Collar and ID tag","Pet food","Food bowl","Water bowl","Travel water bottle","Pet bed","Towels","Waste bags","Pet medication","Vaccination record"]],["cooking","Food & cooking",["Reusable lunch box","Picnic blanket","Travel mug","Reusable cutlery","Food storage bags","Travel snacks","Tea or coffee","Bottle opener"]],["cycling","Cycling",["Bicycle helmet","Cycling gloves","Cycling shoes","High-visibility vest","Repair kit","Spare inner tube","Bike lights","Water bottle","Cycling glasses"]],["water","Diving & water sports",["Snorkel","Mask","Fins","Wetsuit","Rash vest","Water shoes","Dry bag","Buoyancy aid","Waterproof camera"]],["festival","Festivals & events",["Tickets","Earplugs","Small torch","Portable charger","Reusable cup","Rain poncho","Small day bag"]],["goingout","Going out",["Smart outfit","Evening shoes","Small bag","Jewellery","Aftershave or perfume","Travel steamer"]],["fishing","Fishing",["Fishing licence","Rod","Reel","Tackle box","Bait","Polarised sunglasses","Waterproof jacket"]],["horse","Horse riding",["Riding helmet","Riding boots","Jodhpurs","Riding gloves","Body protector","Riding socks"]],["music","Musical instruments",["Instrument","Instrument case","Bow","Rosin","Sheet music","Music stand","Instrument tuner","Spare strings"]],["golf","Golf",["Golf clubs","Golf balls","Tees","Golf shoes","Glove","Rangefinder","Golf clothing"]],["boating","Boating & cruise",["Non-slip shoes","Light waterproof layer","Sunglasses","Sun hat","Seasickness tablets","Dry bag","Travel documents"]],["essentials","Everyday essentials",["Travel pillow","Eye mask","Ear plugs","Reusable water bottle","Small day bag","Laundry bag","Travel adaptor","Spare glasses"]]];
packingGroups.push(...packingLibraryGroups);
for(const [key] of packingLibraryGroups)optional.add(key);
export const packingActivitySections=[["Every trip",[["essentials","Essentials","🎒"],["clothing","Clothing","👕"],["toiletries","Toiletries","🧴"],["electronics","Electronics","🔌"],["documents","Documents","🛂"],["health","Health & medication","🩺"],["sightseeing","Sightseeing","🏛️"],["international","International travel","🌍"],["goingout","Going out","🍽️"]]],["Water & beach",[["bathing","Swimming & bathing","🏊"],["beach","Beach","🏖️"],["diving","Diving & snorkelling","🤿"],["surfing","Surfing","🏄"],["boating","Boating & cruise","⛵"]]],["Outdoors & sport",[["outdoors","Outdoor activities","🌲"],["hiking","Hiking","🥾"],["backpacking","Backpacking","🎒"],["cycling","Cycling","🚲"],["fitness","Fitness","🏋️"],["running","Running","🏃"],["camping","Camping","⛺"],["skiing","Skiing & winter sports","⛷️"],["fishing","Fishing","🎣"],["horse","Horse riding","🐎"],["golf","Golf","⛳"]]],["Work & specialist",[["photography","Photography","📷"],["office","Mobile office","💻"],["business","Business","💼"],["cooking","Cooking","🍳"],["children","Baby & childcare","🍼"],["pets","Dog / pet travel","🐕"],["festival","Festivals","🎟️"],["music","Musical instruments","🎻"],["other","Other activity","＋"]]]];
const activityLibrary={"essentials":["carry","papers","wash","tech","health","clothes","essentials"],"clothing":["clothes","cold"],"toiletries":["wash"],"electronics":["tech"],"documents":["papers","carry"],"health":["health"],"sightseeing":["carry","tech","photography"],"international":["papers","health","tech","carry"],"goingout":["goingout","wash","clothes"],"bathing":["beach","water"],"beach":["beach","water"],"diving":["water","beach"],"surfing":["water","beach"],"boating":["boating","water"],"outdoors":["outdoors","sports"],"hiking":["outdoors","sports"],"backpacking":["outdoors","camping","essentials"],"cycling":["cycling","sports"],"fitness":["sports"],"running":["sports"],"camping":["camping","outdoors"],"skiing":["winter","outdoors"],"fishing":["fishing","outdoors"],"horse":["horse","outdoors"],"golf":["golf","goingout"],"photography":["photography","tech"],"office":["business","tech"],"business":["business","goingout"],"cooking":["cooking","food"],"children":["children","health"],"pets":["pets","health"],"festival":["festival","tech"],"music":["music","tech"],"other":["activity"]};

export function initialisePacking(entries,form){
 const prefix=`form:${form}:pack:`;
 for(const [kind,groups] of [['item',packingGroups],['task',departureGroups]])for(const [group,,names] of groups)names.forEach((name,i)=>{
  const p=prefix+`${kind}-${group}-${i}:`;
  if(entries[p+'name']!==undefined)return;
  entries[p+'name']=name;entries[p+'group']=group;entries[p+'kind']=kind;entries[p+'quantity']='1';entries[p+'packed']='0';
  entries[p+'included']=optional.has(group)||optionalNames.has(name)?'no':'yes';entries[p+'last']=lastNames.has(name)?'yes':'no';
 });
 entries[prefix+'initialised']='yes';
}
export function duplicatePacking(entries,from,to){
 const source=`form:${from}:`,target=`form:${to}:`;
 for(const [key,value] of Object.entries(entries))if(key.startsWith(source)){
  const suffix=key.slice(source.length);
  if(['archived','pinned'].includes(suffix))continue;
  entries[target+suffix]=suffix.endsWith(':packed')?'0':value;
 }
 entries[target+'title']=(entries[source+'title']||'Pack & Go')+' · new trip';
 for(const field of ['date','pack:departure','pack:return'])entries[target+field]='';
}
export function packingRows(entries,form,kind){
 const prefix=`form:${form}:pack:`;
 return Object.keys(entries).filter(k=>k.startsWith(prefix)&&k.endsWith(':kind')&&entries[k]===kind).map(k=>{
  const stem=k.slice(0,-4),get=(field)=>entries[stem+field]||'';
  const quantity=Math.min(999,Math.max(1,Math.floor(Number(get('quantity')))||1)),packed=Math.min(quantity,Math.max(0,Math.floor(Number(get('packed')))||0));
  return {stem,id:stem.slice(prefix.length,-1),name:get('name'),group:get('group'),quantity,packed,included:get('included')==='yes',last:get('last')==='yes',person:get('person'),bag:get('bag')};
 });
}
export function createPackingController(api){
 let view='setup',filter='all',groupBy='section',catalogue=false;
 const {entries,form,esc,save,render,id,openModal,closeModal,toast}=api;
 const prefix=()=>`form:${form()}:pack:`;
 const value=k=>entries()[k]||'';
 const field=(key,label,type='text')=>`<label>${esc(label)}<input type="${type}" data-entry="${esc(key)}" data-no-quick-delete aria-label="${esc(label)}" value="${esc(value(key))}"></label>`;
 function rowHtml(r){
  const complete=r.packed===r.quantity;
  if(catalogue)return `<div class="pack-row"><button class="habit-check ${r.included?'checked':''}" data-pack-toggle="${r.id}" data-pack-field="included" aria-label="${r.included?'Exclude':'Include'} ${esc(r.name)}" aria-pressed="${r.included}">${r.included?'✓':'+'}</button><span>${esc(r.name)}</span><small>${r.included?'Included':'Optional'}</small></div>`;
  return `<div class="pack-row ${complete?'pack-done':''}"><button class="habit-check ${complete?'checked':''}" data-pack-check="${r.id}" aria-label="${complete?'Unpack':'Complete'} ${esc(r.name)}" aria-pressed="${complete}">${complete?'✓':''}</button><span class="pack-name">${esc(r.name)}${r.last?'<small>Pack last</small>':''}</span><span class="pack-count">${r.packed}/${r.quantity}</span><details class="pack-edit"><summary aria-label="Edit ${esc(r.name)}">Details</summary><div>${field(r.stem+'name','Item / task')}${view==='packing'?`${field(r.stem+'quantity','Quantity','number')}${field(r.stem+'packed','Number packed','number')}${field(r.stem+'person','Traveller (blank = shared)')}${field(r.stem+'bag','Bag')}`:''}${field(r.stem+'notes','Notes / booking reference')}<div class="pack-row-actions">${view==='packing'?`<button class="secondary" data-pack-toggle="${r.id}" data-pack-field="last">${r.last?'Remove pack-last marker':'Mark pack last'}</button>`:''}<button class="text-action" data-pack-toggle="${r.id}" data-pack-field="included">Remove from this trip</button><button class="text-action" data-pack-move="${r.id}" data-pack-direction="-1">Move up</button><button class="text-action" data-pack-move="${r.id}" data-pack-direction="1">Move down</button></div></div></details></div>`;
 }

 function choiceButton(group,key,label,icon,active){
  return '<button type="button" class="pack-choice '+(active?'is-selected':'')+'" data-pack-choice="'+group+'" data-pack-choice-value="'+key+'" aria-pressed="'+active+'"><span aria-hidden="true">'+icon+'</span><strong>'+esc(label)+'</strong></button>';
 }
 function renderDesigner(){
  const p=prefix(),selected=key=>(value(p+key)||'').split(',').filter(Boolean);let customTopics=[];try{customTopics=JSON.parse(value(p+'custom-topics')||'[]');if(!Array.isArray(customTopics))customTopics=[];}catch{}
  const departure=value(p+'departure'),back=value(p+'return');
  const nights=departure&&back&&back>=departure?Math.floor((Date.parse(back)-Date.parse(departure))/86400000):null;
  let out='<div class="pack-go pack-designer"><header class="pack-designer-heading"><span class="travel-eyebrow">PACKING, MADE PERSONAL</span><h2>Design your Packing List</h2><p>Choose your dates, who is going and what you will be doing. Tap items to add them.</p></header>';
  out+='<section class="pack-design-section"><h3><span>1</span> When are you going?</h3><div class="pack-date-fields">'+field(p+'departure','Departure date','date')+field(p+'return','Return date','date')+'</div><p class="pack-duration">'+(nights===null?'Choose your dates to see trip length.':(nights+1)+' '+(nights===0?'day':'days')+' · '+nights+' '+(nights===1?'night':'nights'))+'</p></section>';
  out+='<section class="pack-design-section"><h3><span>2</span> Who is going?</h3><p class="planner-guide">Tap plus or minus to set the number of travellers.</p><div class="pack-counter-grid">';
  for(const [key,label,icon] of [['men','Men','👨'],['women','Women','👩'],['children','Children','🧒'],['babies','Babies','👶']]){
   const n=Math.max(0,Math.min(12,Number(value(p+'traveller-'+key))||0));
   out+='<div class="pack-counter"><span class="pack-choice-icon" aria-hidden="true">'+icon+'</span><strong>'+label+'</strong><div><button type="button" data-pack-count="'+key+'" data-pack-count-delta="-1" aria-label="Remove one '+label+'" '+(n?'':'disabled')+'>−</button><output>'+n+'</output><button type="button" data-pack-count="'+key+'" data-pack-count-delta="1" aria-label="Add one '+label+'">＋</button></div></div>';
  }
  out+='</div></section>';
  const transport=[['air','Air','✈️'],['car','Car','🚗'],['train','Train / public transport','🚆'],['motorcycle','Motorcycle','🏍️'],['campervan','Campervan','🚐'],['cruise','Cruise / boat','🛳️'],['other','Other','＋']];
  out+='<section class="pack-design-section"><h3><span>3</span> How are you travelling?</h3><p class="planner-guide">Choose all that apply.</p><div class="pack-choice-grid">'+transport.map(x=>choiceButton('transport',x[0],x[1],x[2],selected('transport').includes(x[0]))).join('')+'</div></section>';
  const weather=[['hot','Hot','☀️'],['warm','Warm','🌤️'],['mild','Mild','🍃'],['cold','Cold','🧥'],['rain','Rain','🌧️'],['snow','Snow / winter','❄️']];
  out+='<section class="pack-design-section"><h3><span>4</span> What weather should we plan for?</h3><p class="planner-guide">Choose what you expect. This is not a live forecast.</p><div class="pack-choice-grid">'+weather.map(x=>choiceButton('weather',x[0],x[1],x[2],selected('weather').includes(x[0]))).join('')+'</div></section>';
  out+='<section class="pack-design-section"><h3><span>5</span> What will you be doing?</h3><p class="planner-guide">Choose an activity to open its suggested items.</p>';
  const activitySections=packingActivitySections.map(section=>section[0]==='Work & specialist'?[section[0],[...section[1],...customTopics.map(topic=>[topic.id,topic.label,'🧩'])]]:section);
  const picked=selected('activities'),activeActivities=picked.length?picked:['essentials'];
  const activityMeta=activitySections.flatMap(section=>section[1]);
  const renderActivityItems=key=>{
   const meta=activityMeta.find(x=>x[0]===key);if(!meta)return '';
   const custom=customTopics.find(topic=>topic.id===key);
   const related=custom?[[custom.id,custom.label,custom.items]]:(activityLibrary[key]||['activity']).map(group=>packingGroups.find(x=>x[0]===group)).filter(Boolean);
   let panel='<details class="pack-suggestion-panel" open><summary><span>'+meta[2]+'</span> Items for '+esc(meta[1])+'</summary>';
   panel+=related.map(group=>'<section><h4>'+esc(group[1])+'</h4><div class="pack-item-choice-grid">'+group[2].map(name=>{
    const row=packingRows(entries(),form(),'item').find(x=>x.name.toLowerCase()===name.toLowerCase()),isOn=!!row?.included;
    return '<button type="button" class="pack-item-choice '+(isOn?'is-selected':'')+'" data-pack-select-item="'+esc(name)+'" data-pack-select-group="'+esc(group[0])+'" aria-pressed="'+isOn+'"><span aria-hidden="true">'+(isOn?'✓':'＋')+'</span>'+esc(name)+'</button>';
   }).join('')+'</div></section>').join('');
   return panel+'</details>';
  };
  out+=activitySections.map(section=>'<details class="pack-activity-group" open><summary>'+esc(section[0])+'</summary><div class="pack-choice-grid">'+section[1].map(x=>choiceButton('activities',x[0],x[1],x[2],picked.includes(x[0])||(!picked.length&&x[0]==='essentials'))).join('')+'</div>'+section[1].filter(x=>activeActivities.includes(x[0])).map(x=>renderActivityItems(x[0])).join('')+'</details>').join('');
  out+='<button type="button" class="pack-add-topic" data-pack-add-topic><span aria-hidden="true">＋</span> Add your own topic</button>';
  out+='</section><div class="pack-designer-actions"><button class="primary" data-pack-view="packing">Open my packing checklist</button><span>'+packingRows(entries(),form(),'item').filter(x=>x.included).length+' items currently included</span></div>';
  out+='<details class="pack-legacy-tools"><summary>More list options</summary><div class="pack-row-actions"><button class="secondary" data-pack-suggest>Suggest clothing quantities</button><button class="secondary" data-pack-kit="cold">Add cold-weather kit</button><button class="secondary" data-pack-kit="swim">Add swimming kit</button><button class="secondary" data-pack-kit="music">Add cello kit</button></div><p class="planner-guide">Your saved items, personal kits and packing progress are kept.</p></details></div>';
  return out;
 }

 function renderPacking(){
  const p=prefix(),kind=view==='departure'?'task':'item',customTopics=(()=>{try{return JSON.parse(value(prefix()+'custom-topics')||'[]');}catch{return [];}})(),groups=kind==='task'?departureGroups:[...packingGroups,...customTopics.map(topic=>[topic.id,topic.label,topic.items])];
  const all=packingRows(entries(),form(),kind),included=all.filter(r=>r.included),done=included.filter(r=>r.packed===r.quantity).length;
  let visible=all.filter(r=>catalogue||r.included).filter(r=>catalogue||filter==='all'||filter==='remaining'&&r.packed<r.quantity||filter==='last'&&r.last&&r.packed<r.quantity||filter==='final'&&r.packed<r.quantity);
  const ordered=visible.sort((a,b)=>(Number(value(a.stem+'order'))||0)-(Number(value(b.stem+'order'))||0));
  const buckets=groupBy==='section'||kind==='task'||catalogue?groups.map(([key,label])=>[key,label,ordered.filter(r=>r.group===key)]):[...new Set(ordered.map(r=>groupBy==='person'?r.person||'Shared':r.bag||'Unassigned bag'))].map(label=>[label,label,ordered.filter(r=>(groupBy==='person'?r.person||'Shared':r.bag||'Unassigned bag')===label)]);
  return `<div class="pack-go"><nav class="pack-views" aria-label="Packing List views">${[['setup','Design list'],['packing','My packing'],['departure','Before I leave']].map(([key,label])=>`<button class="secondary" data-pack-view="${key}" aria-pressed="${view===key}">${label}</button>`).join('')}</nav>${view==='setup'?renderDesigner():`<div class="pack-progress"><span>${done} of ${included.length} ${kind==='task'?'tasks complete':'items packed'}</span><progress max="${included.length||1}" value="${done}" aria-label="${kind==='task'?'Departure':'Packing'} progress"></progress></div><div class="pack-controls"><div>${[['all','All'],['remaining','Outstanding'],...(kind==='item'?[['last','Pack last']]:[['final','Final check']])].map(([key,label])=>`<button class="text-action" data-pack-filter="${key}" aria-pressed="${filter===key}">${label}</button>`).join('')}</div>${kind==='item'?`<label>Group by <select data-pack-group><option value="section" ${groupBy==='section'?'selected':''}>Section</option><option value="person" ${groupBy==='person'?'selected':''}>Traveller</option><option value="bag" ${groupBy==='bag'?'selected':''}>Bag</option></select></label>`:''}<button class="secondary" data-pack-catalogue>${catalogue?'Back to checklist':'Choose items'}</button></div><div class="pack-sections ${filter==='final'?'pack-final':''}">${buckets.filter(([, ,rows])=>rows.length).map(([key,label,rows])=>`<details class="pack-section" open><summary>${esc(label)} <small>${rows.length}</small></summary>${rows.map(rowHtml).join('')}<button class="text-action" data-pack-add="${esc(groupBy==='section'||kind==='task'||catalogue?key:groups[0][0])}">+ Add ${kind==='task'?'task':'item'}</button></details>`).join('')||'<p class="empty-note">Nothing outstanding in this view.</p>'}</div><button class="text-action" data-pack-add="${groups[0][0]}">+ Add ${kind==='task'?'task':'item'}</button>`}<div class="pack-footer"><button class="secondary" data-pack-duplicate>Duplicate for another trip</button><button class="text-action" data-pack-template>Save as my usual list</button></div></div>`;
 }
 function addItem(name,group,kind='item'){
  const p=prefix()+`${kind}-custom-${id()}:`;
  for(const [k,v] of Object.entries({name,group,kind,quantity:'1',packed:'0',included:'yes',last:'no'}))entries()[p+k]=v;
 }
 function handle(data){
  if(!Object.keys(data).some(k=>k.startsWith('pack')))return false;
  const p=prefix();
  if(data.packChoice){const key=data.packChoice,k=p+key,items=(value(k)||'').split(',').filter(Boolean),choice=String(data.packChoiceValue||'');entries()[k]=items.includes(choice)?items.filter(x=>x!==choice).join(','):[...items,choice].join(',');save();render();return true;}
  if(data.packCount){const key=p+'traveller-'+data.packCount,next=Math.max(0,Math.min(12,(Number(value(key))||0)+Number(data.packCountDelta||0)));entries()[key]=String(next);save();render();return true;}
  if(data.packSelectItem){const name=String(data.packSelectItem),row=packingRows(entries(),form(),'item').find(x=>x.name.toLowerCase()===name.toLowerCase());if(row)entries()[row.stem+'included']=row.included?'no':'yes';else addItem(name,data.packSelectGroup||'activity');save();render();return true;}
  if('packAddTopic'in data){openModal('Add your own activity',`<form id="pack-topic-form"><label>Activity name<input name="label" required maxlength="50" placeholder="e.g. Pottery workshop"></label><label>Suggested items <small>Optional · separate with commas or new lines</small><textarea name="items" rows="4" placeholder="Apron, sketchbook, pencils"></textarea></label><div class="modal-footer"><button type="button" class="secondary" data-action="close-modal">Cancel</button><button class="primary" type="submit">Add activity</button></div></form>`);return true;}
  if(data.packView){view=data.packView;filter='all';catalogue=false;render();return true;}
  if(data.packFilter){filter=data.packFilter;catalogue=false;render();return true;}
  if('packCatalogue'in data){catalogue=!catalogue;render();return true;}
  if(data.packAdd){openModal('Add '+(view==='departure'?'departure task':'packing item'),`<form id="pack-add-form" data-group="${esc(data.packAdd)}" data-kind="${view==='departure'?'task':'item'}"><label>What to add<input name="name" required maxlength="160" autofocus></label><div class="modal-footer"><button class="primary" type="submit">Add</button></div></form>`);return true;}
  if(data.packCheck){const r=packingRows(entries(),form(),view==='departure'?'task':'item').find(r=>r.id===data.packCheck);if(r)entries()[r.stem+'packed']=String(r.packed===r.quantity?0:r.quantity);}
  if(data.packToggle){if(!['included','last'].includes(data.packField))return true;const k=p+data.packToggle+':'+data.packField;entries()[k]=value(k)==='yes'?'no':'yes';}
  if(data.packMove){const rows=packingRows(entries(),form(),view==='departure'?'task':'item').filter(r=>r.included),current=rows.find(r=>r.id===data.packMove);if(current){const siblings=rows.filter(r=>r.group===current.group).sort((a,b)=>(Number(value(a.stem+'order'))||0)-(Number(value(b.stem+'order'))||0));const i=siblings.indexOf(current),j=i+Number(data.packDirection);if(j>=0&&j<siblings.length){[siblings[i],siblings[j]]=[siblings[j],siblings[i]];siblings.forEach((r,n)=>entries()[r.stem+'order']=String(n+1));}}}
  if('packDuplicate'in data){const key=id();duplicatePacking(entries(),form(),key);api.select(key);toast('New trip created. Packing and departure checks reset.');}
  if('packTemplate'in data){const key=id();duplicatePacking(entries(),form(),key);entries()[`form:${key}:title`]='My usual packing list';toast('Usual list saved. Open it in saved forms and duplicate it for a trip.');}
  if(data.packKit){const names=data.packKit==='cold'?packingGroups.find(g=>g[0]==='cold')[2]:data.packKit==='music'?['Cello','Bow','Rosin','Sheet music']:['Swimwear'];for(const r of packingRows(entries(),form(),'item'))if(names.includes(r.name))entries()[r.stem+'included']='yes';toast('Kit added. Your quantities and checks were kept.');}
  if('packCustomKit'in data){const names=value(p+'kit-items').split(',').map(n=>n.trim()).filter(Boolean);if(!names.length){toast('Write kit items separated by commas first.');return true;}for(const name of names){const existing=packingRows(entries(),form(),'item').find(r=>r.name.toLowerCase()===name.toLowerCase());if(existing)entries()[existing.stem+'included']='yes';else addItem(name,'activity');}toast('Personal kit added.');}
  if('packSuggest'in data){const start=value(p+'departure'),end=value(p+'return'),laundry=Math.floor(Number(value(p+'laundry')));const days=Math.floor((Date.parse(end)-Date.parse(start))/86400000)+1;if(!Number.isFinite(days)||days<1){toast('Choose valid departure and return dates first.');return true;}const n=Math.min(999,laundry>0?Math.min(days,laundry):days);const rows=packingRows(entries(),form(),'item').filter(r=>['Underwear','Socks','T-shirts'].includes(r.name));openModal('Suggested clothing quantities',`<p>${days} days${laundry>0?`, laundry every ${laundry} days`:''}. Review before applying; other items stay as you set them.</p><form id="pack-quantity-form">${rows.map(r=>`<label>${esc(r.name)}<input name="${r.id}" type="number" min="1" max="999" value="${n}" required></label>`).join('')}<div class="modal-footer"><button class="secondary" type="button" data-action="close-modal">Cancel</button><button class="primary" type="submit">Apply quantities</button></div></form>`);return true;}
  save();render();return true;
 }
 function submit(f,data){if(f.id==='pack-topic-form'){const label=(data.label||'').trim();if(!label)return true;let custom=[];try{custom=JSON.parse(value(prefix()+'custom-topics')||'[]');}catch{}const items=(data.items||'').split(/[,;\\n]+/).map(x=>x.trim()).filter(Boolean);const id='custom-'+api.id();custom.push({id,label,items});entries()[prefix()+'custom-topics']=JSON.stringify(custom);const key=prefix()+'activities',selected=(value(key)||'').split(',').filter(Boolean);if(!selected.includes(id))selected.push(id);entries()[key]=selected.join(',');}else if(f.id==='pack-add-form'){const name=(data.name||'').trim();if(!name)return true;addItem(name,f.dataset.group,f.dataset.kind);}else if(f.id==='pack-quantity-form'){for(const [row,q] of Object.entries(data)){const stem=prefix()+row+':',n=Math.min(999,Math.max(1,Math.floor(Number(q))||1));entries()[stem+'quantity']=String(n);entries()[stem+'packed']=String(Math.min(n,Number(value(stem+'packed'))||0));}}else return false;save();closeModal();render();return true;}
 function changed(target){if(target.matches('[data-pack-group]')){groupBy=target.value;render();}else if(target.dataset.entry?.startsWith(prefix())&&/:(quantity|packed)$/.test(target.dataset.entry)){const stem=target.dataset.entry.replace(/(quantity|packed)$/,'');const n=Math.min(999,Math.max(1,Math.floor(Number(value(stem+'quantity')))||1));entries()[stem+'quantity']=String(n);entries()[stem+'packed']=String(Math.min(n,Math.max(0,Math.floor(Number(value(stem+'packed')))||0)));save();render();}else if(target.dataset.entry?.startsWith(prefix()))render();}
 return {render:renderPacking,handle,submit,changed,setView:value=>{if(value==='setup'||value==='packing'||value==='departure')view=value;}};
}

