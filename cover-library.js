// Additive catalogue. IDs 0–39 are the original collection and never change.
export const categories=[
 ['leather','Leather & Suede',['Calfskin cognac','Distressed saddle','Crocodile oxblood','Ostrich ivory','Velvet suede','Quilted midnight','Hand-tooled forest','Saffiano burgundy']],
 ['metal','Metals',['Brushed titanium','Polished chrome','Hammered copper','Aged bronze','Damascus steel','Rose gold','Oxidised silver','Champagne brass']],
 ['glass','Glass & Crystal',['Cathedral stained glass','Frosted sea glass','Dichroic prism','Murano lagoon','Cut crystal','Art Nouveau glass','Smoked glass','Amber mosaic']],
 ['gems','Gemstones & Jewels',['Emerald facets','Sapphire midnight','Ruby cabochon','Amethyst geode','Opal fire','Lapis constellations','Malachite bands','Mother-of-pearl']],
 ['wood','Wood & Natural Materials',['Walnut burl','Ebony grain','Rosewood','Olive wood','Bamboo','Cork','Florentine marquetry','Birch inlay']],
 ['fabric','Fabrics & Textiles',['Midnight velvet','Champagne silk','Natural linen','Royal brocade','Sage damask','Highland tweed','Embroidered tapestry','Kimono silk']],
 ['stone','Stone & Marble',['Nero gold marble','Carrara marble','Honey onyx','Jade stone','Midnight granite','Alabaster','Travertine','Blue sodalite']],
 ['historic','Historical & Artistic Styles',['Art Deco sunburst','Art Nouveau vines','Victorian atelier','Baroque gilding','Rococo blush','Renaissance medallion','Gothic tracery','Byzantine mosaic']],
 ['fantasy','Fantasy & Imagination',['Steampunk observatory','Celestial atlas','Alchemy manuscript','Enchanted forest','Dragon scales','Mechanical clockwork','Cosmic nebula','Lunar eclipse']],
 ['nature','Nature & Botanical',['Pressed wildflowers','Autumn canopy','Kintsugi garden','Botanical study','Moss woodland','Ocean currents','Butterfly wings','Fern herbarium']],
 ['modern','Modern & Abstract',['Bauhaus composition','Quiet minimalism','Geometric relief','Mid-century rhythm','Liquid metal','Holographic spectrum','Optical labyrinth','Sculpted dunes']],
 ['books','Rare Books & Manuscripts',['Illuminated hours','Medieval binding','Antique atlas','Gilded folio','Parchment study','Scientific archive','Astronomer’s journal','Venetian endpaper']]
].map(([id,name,names])=>({id,name,names}));
const palettes=[['#653326','#bb7f4b'],['#26343d','#c3b8a5'],['#194653','#73bdb3'],['#113d39','#5da88c'],['#37281e','#b98b51'],['#34304c','#9c899d'],['#242d30','#d4c6aa'],['#253d3c','#bd9d56'],['#182d3c','#8f9fb0'],['#29473b','#99af7c'],['#283c4c','#e1ad73'],['#59402b','#c6ac70']];
export const newCovers=categories.flatMap((category,g)=>category.names.map((name,v)=>({id:40+g*8+v,name,category:category.id,material:['leather','foil','gloss','gloss','relief','cloth','gloss','relief','relief','printed','gloss','leather'][g],group:g,variant:v,colors:palettes[g],file:`assets/collection/cover-${40+g*8+v}.${[40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 109, 110].includes(40+g*8+v)?'webp':'svg'}?v=3`,featured:v===0,light:(g===6&&[1,4,6].includes(v))||(g===5&&[1,2].includes(v))})));
export const coverById=id=>newCovers.find(c=>c.id===Number(id));
export const defaultOptions=Object.freeze({finish:'natural',decoration:'none',clasp:'none',lettering:'full',tint:'original'});
export const optionChoices={finish:['natural','matte','glossy','brushed','distressed','iridescent'],decoration:['none','gold corners','embossed border','filigree','gemstones'],clasp:['none','leather strap','magnetic','antique brass','silver'],lettering:['full','initials','name','year','none'],tint:['original','warm','cool','rose']};
export function readCoverOptions(entries){let raw;try{raw=JSON.parse(entries?.['cover:personalisation']||'{}');}catch{raw={};}return Object.fromEntries(Object.entries(defaultOptions).map(([k,v])=>[k,optionChoices[k].includes(raw?.[k])?raw[k]:v]));}
export function coverAttributes(){return 'data-finish="natural" data-decoration="none" data-clasp="none" data-lettering="full" data-tint="original"';}
export function ornaments(){return '';}
// Individual palettes and motifs are intentional: category membership must not
// turn differently named materials into recoloured copies of one placeholder.
const materialPalettes=[
 ['#653020/#bb824b','#48271b/#9f6337','#310d20/#881c37','#b6a589/#eee1bd','#5d3959/#b79cae','#091b34/#395777','#092c22/#497d45','#320f24/#7f304b'],
 ['#424c54/#b8c0c5','#576575/#f2f8ff','#66331e/#e7a27b','#35392a/#ad9755','#172735/#8d9fa8','#9e5b65/#f2c2ac','#24232d/#a4a5b0','#847047/#f2dc9e'],
 ['#122a47/#d5a243','#9ecbc3/#e1eee7','#31125a/#7ce8f1','#073e4a/#3eada8','#9eb7c8/#f5fcff','#143e35/#a9bd79','#151e29/#536471','#6c3114/#e1a33f'],
 ['#032d26/#17a574','#07162e/#3465c0','#3b061c/#d73659','#281139/#b178d5','#c3c5b9/#f3f0df','#091c52/#476aaa','#073b2b/#68bd77','#bdc5cb/#f8e8dd'],
 ['#302014/#b0884b','#080f13/#414951','#2c1014/#984d37','#68522b/#c6af73','#7b7442/#ded5a0','#78563b/#b99b73','#241b19/#c49c55','#aa8e62/#e6d7ac'],
 ['#080f2a/#36406e','#ad9774/#f5e8ca','#b3a389/#ebe1c9','#251337/#b39a54','#556b59/#a6b299','#3c4143/#9a8a72','#243b42/#cfa678','#40162b/#ca8998'],
 ['#0b1116/#bc9b51','#c4cbce/#f2f3ee','#71421c/#e8bb6d','#164d3a/#8abfa0','#111d29/#627a88','#b0a38c/#eee5ce','#927650/#d9c29b','#122c60/#5e91c1'],
 ['#0c2732/#d4b265','#20352d/#b2b678','#33203a/#bd9974','#2d1c15/#d1a445','#b9777d/#f5d5b3','#273a4b/#c7a76b','#172333/#a9a9a4','#35254b/#dab152'],
 ['#1c272b/#ba8854','#091b36/#bac6d1','#302c1f/#c4b27c','#092d29/#528a58','#142a29/#5c9177','#281a12/#c79a59','#160f38/#8a6fc0','#070f20/#b1bac9'],
 ['#a59675/#e3d6ae','#422620/#c68536','#173e39/#bda55e','#b8baa0/#e9e3c9','#16372b/#7a9868','#053346/#409daf','#173750/#a5bbce','#647454/#ced4aa'],
 ['#c8bca1/#f0dfbc','#d3cbbf/#f2eee6','#263b43/#9aacae','#243c3a/#d8a770','#24323d/#d0dae1','#403457/#c4d5d8','#141d27/#a7b6ba','#b08869/#e5c8a1'],
 ['#15294a/#d2b667','#311e19/#ad8351','#9f8762/#e6d5ac','#152c29/#d0ac5c','#b5a07e/#e5d5b0','#382e23/#b9ac86','#102137/#c8b676','#193f47/#b79163']
].map(row=>row.map(x=>x.split('/')));
export function artwork(c){
 const {group:g,variant:v}=c,[base,accent]=materialPalettes[g][v],gold='#d2b16d';let art='';
 const path=(d,col=accent,w=2,op=.65)=>`<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" opacity="${op}"/>`;
 const rect=(x,y,w,h,fill,op=1,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" opacity="${op}" ${extra}/>`;
 const circle=(x,y,r,fill=accent,op=1)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" opacity="${op}"/>`;
 const border=(inset=48,col=accent)=>rect(inset,inset,1200-inset*2,840-inset*2,'none',.7,`rx="12" stroke="${col}" stroke-width="3"`);
 const leaf=(x,y,s=1,col=accent)=>`<g transform="translate(${x} ${y}) scale(${s})">${path('M0 60Q-30 -20 0 -85Q50 -30 0 60',col,3)}${path('M0 60V-75M0 0l-15 -22M0 20l20 -30',col,2)}</g>`;
 const gear=(x,y,r,col=gold)=>`<g transform="translate(${x} ${y})"><circle r="${r}" fill="none" stroke="${col}" stroke-width="14"/>${Array.from({length:16},(_,i)=>`<path transform="rotate(${i*22.5})" d="M-7 -${r-8}v-24h14v24" fill="${col}"/>`).join('')}<circle r="${r*.55}" fill="none" stroke="${col}" stroke-width="3"/>${path(`M-${r} 0H${r}M0 -${r}V${r}`,col,4)}</g>`;
 if(g===0){
  art+=border();
  if(v===0)for(let i=0;i<2400;i++)art+=circle(i*83%1200,i*137%840,.6+i%3*.45,accent,.16);
  if(v===1)for(let i=0;i<90;i++)art+=path(`M${i*67%1200} ${i*113%840}l${40+i%80} -15`,'#e7c494',1,.3);
  if(v===2)for(let y=0;y<840;y+=65)for(let x=0;x<1200;x+=90)art+=rect(x+(y%130?45:0),y,82,57,'none',.6,`rx="15" stroke="${accent}" stroke-width="5"`);
  if(v===3)for(let y=0;y<840;y+=34)for(let x=0;x<1200;x+=38)art+=circle(x+(y%68?19:0),y,3,'#766448',.5);
  if(v===4)for(let i=0;i<360;i++)art+=path(`M0 ${i*3}h1200`,accent,1,.14);
  if(v===5)for(let i=-900;i<1300;i+=90)art+=path(`M${i} 0l840 840M${i} 840l840 -840`,accent,4,.65);
  if(v===6)for(let x=90;x<1200;x+=120)for(let y=70;y<850;y+=180)art+=leaf(x,y,.8)+leaf(x+40,y+40,-.6);
  if(v===7)for(let i=-840;i<1200;i+=12)art+=path(`M${i} 0l840 840M${i} 840l840 -840`,accent,1,.4);
 }
 if(g===1){
  if([0,1,5,7].includes(v))for(let i=0;i<230;i++)art+=path(`M0 ${i*4}h1200`,accent,i%5?1:2,.2);
  if(v===1)art+=path('M-100 700L900 -100M200 940L1300 100','#fff',170,.35);
  if(v===2)for(let i=0;i<850;i++)art+=`<ellipse cx="${i*97%1200}" cy="${i*73%840}" rx="18" ry="13" fill="none" stroke="${accent}" stroke-width="3" opacity=".32"/>`;
  if(v===3)for(let i=0;i<150;i++)art+=circle(i*131%1200,i*181%840,10+i%30,'#529b7f',.18);
  if(v===4)for(let i=-30;i<110;i++)art+=path(`M-20 ${i*13}C260 ${i*13-180} 440 ${i*13+200} 650 ${i*13}S950 ${i*13-160} 1240 ${i*13+40}`,accent,3,.6);
  if(v===6)for(let i=0;i<180;i++)art+=circle(i*139%1200,i*193%840,8+i%55,'#12101e',.17);
 }
 if(g===2){
  if(v===0||v===7)for(let y=0;y<900;y+=100)for(let x=0;x<1250;x+=100)art+=rect(x,y,96,96,`hsl(${v===0?(x*3+y)%360:25+(x+y)%30} 45% ${25+(x+y)%35}%)`,.85,'stroke="#16262d" stroke-width="6"');
  if(v===1)for(let i=0;i<50;i++)art+=circle(i*137%1200,i*193%840,40+i%50,'#d5f1e5',.18);
  if(v===2)for(let i=-5;i<16;i++)art+=`<path d="M${i*100} 0l240 420 -240 420 -100 -420Z" fill="hsl(${i*39+180} 70% 70%)" opacity=".45"/>`;
  if(v===3)for(let i=0;i<40;i++)art+=path(`M-20 ${i*25}Q280 ${i*25-170} 600 ${i*25}T1220 ${i*25}`,i%3?'#69d2c2':gold,8,.5);
  if(v===4)for(let x=-100;x<1300;x+=150)for(let y=-50;y<900;y+=150)art+=`<path d="M${x} ${y}l75 -75 75 75 -75 75Z" fill="#fff" opacity=".2" stroke="${base}" stroke-width="3"/>`;
  if(v===5)for(let x=80;x<1250;x+=180)art+=leaf(x,580,3,gold)+path(`M${x} 0Q${x+150} 420 ${x} 840`,gold,5,.65);
  if(v===6)art+=path('M-100 600L900 -100M200 940L1300 100','#b2c7ce',120,.14);
 }
 if(g===3){
  if(v===0||v===1)for(let y=-80;y<900;y+=170)for(let x=-90;x<1300;x+=210)art+=`<path d="M${x} ${y}l105 -60 105 60v115l-105 60 -105 -60Z M${x} ${y}l105 65 105 -65M${x+105} ${y+65}v110" fill="${accent}" fill-opacity="${.16+(x+y+200)%5*.07}" stroke="${accent}" stroke-width="4"/>`;
  if(v===2)for(let y=75;y<850;y+=170)for(let x=85;x<1200;x+=180)art+=`<ellipse cx="${x}" cy="${y}" rx="65" ry="80" fill="${accent}" opacity=".5" stroke="${gold}" stroke-width="4"/>`+circle(x-20,y-30,13,'#fff',.3);
  if(v===3)for(let i=0;i<22;i++)art+=`<ellipse cx="600" cy="420" rx="${70+i*32}" ry="${40+i*24}" fill="none" stroke="${i%3?accent:'#e5d8ed'}" stroke-width="12" opacity=".55"/>`;
  if(v===4||v===7)for(let i=0;i<130;i++)art+=`<ellipse cx="${i*137%1200}" cy="${i*179%840}" rx="${v===4?50:100}" ry="${v===4?24:60}" transform="rotate(${i*31})" fill="hsl(${i*37%360} ${v===4?65:25}% ${v===4?70:86}%)" opacity=".45"/>`;
  if(v===5)for(let i=0;i<160;i++)art+=circle(i*131%1200,i*193%840,i%5===0?3:1.5,gold,.85);
  if(v===6)for(let i=0;i<45;i++)art+=`<ellipse cx="260" cy="470" rx="${50+i*27}" ry="${30+i*17}" fill="none" stroke="${i%2?accent:'#072e23'}" stroke-width="10"/>`;
 }
 if(g===4){
  if(v<4)for(let i=0;i<110;i++)art+=path(`M${i*13} -20C${i*13+160} 180 ${i*13-140} 580 ${i*13+25} 870`,accent,i%5?2:5,.36);
  if(v===0)for(let i=0;i<12;i++)art+=`<ellipse cx="${i*197%1200}" cy="${i*173%840}" rx="${30+i*5}" ry="${15+i*3}" fill="none" stroke="${base}" stroke-width="8" opacity=".55"/>`;
  if(v===4)for(let x=0;x<1200;x+=65)art+=rect(x,0,58,840,accent,.22)+path(`M${x} 260h58M${x} 570h58`,base,6,.7);
  if(v===5)for(let i=0;i<2300;i++)art+=circle(i*131%1200,i*193%840,2+i%5,i%2?base:accent,.4);
  if(v===6||v===7)for(let x=-100;x<1300;x+=140)for(let y=-80;y<900;y+=140)art+=`<path d="M${x} ${y}l70 -70 70 70 -70 70Z" fill="${(x+y)%280===0?accent:base}" stroke="${gold}" stroke-width="2" opacity=".7"/>`;
 }
 if(g===5){
  for(let x=0;x<1200;x+=6)art+=path(`M${x} 0v840`,accent,1,.15);for(let y=0;y<840;y+=8)art+=path(`M0 ${y}h1200`,accent,1,.12);
  if(v===1)for(let i=0;i<15;i++)art+=path(`M${i*110-100} 0Q${i*110+140} 400 ${i*110-80} 840`,'#fff',35,.12);
  if(v===3||v===4||v===6)for(let x=80;x<1200;x+=150)for(let y=90;y<840;y+=180)art+=leaf(x,y,1.1,v===6?'#cf9a82':accent)+leaf(x+30,y+70,-.8);
  if(v===5)for(let i=0;i<1200;i+=60)art+=rect(i,0,20,840,'#c09664',.2)+rect(0,i,1200,20,'#c09664',.2);
  if(v===7)for(let x=0;x<1200;x+=130)for(let y=0;y<840;y+=130)art+=`<path d="M${x} ${y}q65 -110 130 0q-65 110 -130 0Z" fill="none" stroke="${accent}" stroke-width="5"/>`;
 }
 if(g===6){
  if(v!==4&&v!==6)for(let i=-10;i<35;i++)art+=path(`M${i*65} -20Q${i*65+270} 200 ${i*65-70} 440T${i*65+200} 900`,v===1?'#6e7e85':i%4?accent:gold,i%5?2:7,.5);
  if(v===4)for(let i=0;i<2200;i++)art+=circle(i*131%1200,i*193%840,1+i%4,i%2?accent:'#e1d8c8',.45);
  if(v===6)for(let i=0;i<100;i++)art+=path(`M0 ${i*9}q300 -15 600 0t600 0`,accent,i%3?2:5,.5);
 }
 if(g===7||g===11){
  art+=border(40,gold)+border(58,gold);
  if((g===7&&v===0)||(g===11&&v===6))for(let i=0;i<25;i++)art+=path(`M600 730L${i*60-120} 65`,gold,3,.65);
  else if((g===7&&[1,2,3,4].includes(v))||(g===11&&v===0))for(let x of [95,1105])for(let y=100;y<820;y+=130)art+=leaf(x,y,1,gold)+leaf(x+30,y+50,-.7,gold);
  else if((g===7&&v===6)||(g===11&&v===1))for(let x=160;x<1200;x+=220)art+=path(`M${x-80} 770V270Q${x-80} 150 ${x} 80Q${x+80} 150 ${x+80} 270V770`,gold,5,.7);
  else if((g===7&&v===7)||(g===11&&v===7))for(let x=90;x<1150;x+=65)for(let y=90;y<800;y+=65)art+=rect(x,y,55,55,`hsl(${(x+y)*3%360} 35% 45%)`,.65);
  else if(g===11&&v===4)for(let y=160;y<740;y+=35)art+=path(`M160 ${y}h${650+y%170}`,base,2,.25);
  else if(g===11&&v===5)for(let x=180;x<1100;x+=200)art+=path(`M${x} 160q-100 200 0 400t0 200`,gold,2,.5);
  else {art+=`<ellipse cx="600" cy="420" rx="240" ry="300" fill="none" stroke="${gold}" stroke-width="8"/>`;for(let i=0;i<16;i++)art+=`<g transform="rotate(${i*22.5} 600 420)">${leaf(600,180,.8,gold)}</g>`;}
  if(g===11&&v===2)for(let i=0;i<13;i++)art+=path(`M${i*100} 90q100 300 0 660M90 ${i*60}h1020`,base,2,.25);
 }
 if(g===8){
  if([0,5].includes(v))for(let i=0;i<13;i++)art+=gear(i*271%1200,i*197%840,45+i%4*18);
  if([1,6,7].includes(v)){for(let i=0;i<280;i++)art+=circle(i*131%1200,i*193%840,i%7===0?3:1,'#e0d9c6',.7);if(v===1)for(let i=0;i<20;i++)art+=path(`M${i*61} ${i*137%840}l90 -50 80 90`,accent,1,.55);if(v===6)for(let i=0;i<35;i++)art+=circle(i*137%1200,i*193%840,70,'#b65dbd',.07);if(v===7)art+=circle(600,420,210,'#ccd2d9',.85)+circle(655,390,198,base);}
  if(v===2){art+=border(65,gold);for(let i=0;i<7;i++)art+=`<g transform="translate(${170+i*140} ${i%2?650:170})">${path('M0 -55L48 28H-48Z',gold,3)}<circle r="60" fill="none" stroke="${gold}" stroke-width="2"/></g>`;}
  if(v===3)for(let x=0;x<1250;x+=95)art+=path(`M${x} 900Q${x-40} 400 ${x+30} -30`,accent,16,.5)+leaf(x,370,2);
  if(v===4)for(let y=-60;y<900;y+=85)for(let x=0;x<1300;x+=110)art+=`<path d="M${x+(y%170?55:0)-55} ${y}q55 130 110 0" fill="${base}" stroke="${accent}" stroke-width="4"/>`;
 }
 if(g===9){
  if([0,3,4,7].includes(v))for(let i=0;i<30;i++){const x=i*137%1200,y=i*193%840;art+=leaf(x,y,1.2);if(v===0)for(let j=0;j<6;j++)art+=`<ellipse cx="${x}" cy="${y-65}" rx="10" ry="24" transform="rotate(${j*60} ${x} ${y-45})" fill="${['#965571','#b58d46','#788bab'][i%3]}"/>`;if(v===7)for(let j=0;j<7;j++)art+=leaf(x+10,y-j*18,.3);}
  if(v===1)for(let i=0;i<100;i++)art+=leaf(i*137%1200,i*193%840,.9,['#b86f29','#ca9e46','#873c2f'][i%3]);
  if(v===2)for(let i=0;i<12;i++)art+=path(`M${i*110} 0l-30 150 90 170 -65 200 100 320`,gold,4,.85);
  if(v===5)for(let i=-8;i<40;i++)art+=path(`M-20 ${i*28}Q300 ${i*28-240} 600 ${i*28}T1220 ${i*28}`,accent,5,.55);
  if(v===6)for(let i=0;i<24;i++){const x=i*137%1200,y=i*193%840;art+=`<path d="M${x} ${y}c-120 -140 -130 100 0 30c130 70 120 -170 0 -30Z" fill="${accent}" opacity=".65"/>`+path(`M${x} ${y-10}v65`,base,4,1);}
 }
 if(g===10){
  if(v===0||v===3)for(let i=0;i<24;i++){const x=i*137%1200,y=i*193%840;art+=i%2?circle(x,y,35+i%4*15,['#b04432','#d8a640','#304c65'][i%3],.85):rect(x,y,110,100,['#b04432','#d8a640','#304c65'][i%3],.85);}
  if(v===1)art+=circle(900,210,130,accent,.7)+path('M170 650H1030',base,2,.5);
  if(v===2)for(let x=-100;x<1300;x+=140)for(let y=-50;y<900;y+=140)art+=`<path d="M${x} ${y}l70 -40 70 40v80l-70 40 -70 -40Z M${x} ${y}l70 40 70 -40M${x+70} ${y+40}v120" fill="none" stroke="${accent}" stroke-width="4"/>`;
  if(v===4||v===7)for(let i=-10;i<55;i++)art+=path(`M-30 ${i*25}C300 ${i*25-190} 600 ${i*25+190} 1230 ${i*25-150}`,accent,v===4?12:3,.5);
  if(v===5)for(let i=0;i<20;i++)art+=`<path d="M${i*70-100} 0l300 840h90L${i*70-10} 0Z" fill="hsl(${i*32} 65% 75%)" opacity=".4"/>`;
  if(v===6)for(let i=0;i<20;i++)art+=rect(i*28,i*20,1200-i*56,840-i*40,'none',.75,`stroke="${accent}" stroke-width="7"`);
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="840" viewBox="0 0 1200 840"><title>${c.name.replaceAll('&','&amp;')}</title><defs><linearGradient id="base" x2="100%" y2="100%"><stop stop-color="${base}"/><stop offset=".52" stop-color="${accent}"/><stop offset="1" stop-color="${base}"/></linearGradient><linearGradient id="spine"><stop stop-color="#000" stop-opacity=".6"/><stop offset=".035" stop-color="#fff" stop-opacity=".22"/><stop offset=".075" stop-color="#000" stop-opacity=".3"/><stop offset=".14" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient><filter id="grain"><feTurbulence baseFrequency="${g===0?.6:.18}" numOctaves="2" seed="${c.id}" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs>${rect(0,0,1200,840,'url(#base)')}${art}${rect(0,0,1200,840,'#fff',.055,'filter="url(#grain)"')}${rect(0,0,1200,840,'url(#spine)')}</svg>`;
}

// Physical substrate drives both the personal lettering and permanent brand.
export function coverSurface(id){
 const n=Number(id),design=coverById(n);
 const overrides={104:'metal',105:'leather',106:'parchment',107:'wood',108:'leather',109:'metal',110:'glass',111:'stone',112:'parchment',113:'leather',114:'stone',115:'parchment',116:'wood',117:'glass',118:'fabric',119:'parchment',120:'leather',121:'stone',122:'metal',123:'wood',124:'metal',125:'glass',126:'metal',127:'stone',128:'leather',129:'leather',130:'parchment',131:'leather',132:'parchment',133:'leather',134:'leather',135:'parchment'};
 if(overrides[n])return overrides[n];
 if(design)return ['leather','metal','glass','gem','wood','fabric','stone','leather'][design.group]||'leather';
 return [3,7,30,38].includes(n)?'gem':[9,27].includes(n)?'metal':[5,6].includes(n)?'metal':[8,10,14,19,28,31].includes(n)?'fabric':[15,29].includes(n)?'wood':'leather';
}
export function coverInscription({id,owner='',title='',year,escape:esc}){
 const design=coverById(id),g=design?.group,surface=coverSurface(id);
 const ornate=design&&![0,4,6].includes(g);
 return `<span class="cover-inscription" data-surface="${surface}" data-placement="${ornate?'left':'centre'}"><span class="cover-year">${year}</span>${owner?`<span class="cover-owner">${esc(owner)}</span>`:''}${title?`<span class="cover-title">${esc(title)}</span>`:''}</span><span class="emboss-logo cover-brand" data-surface="${surface}" data-placement="${ornate?'left':'centre'}" aria-label="Unbound">unbound</span>`;
}
