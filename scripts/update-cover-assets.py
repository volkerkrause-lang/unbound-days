"""Checkpoint artwork bytes and synchronise runtime/offline references. Never generates art."""
import json,pathlib,hashlib,re
root=pathlib.Path(__file__).resolve().parents[1]
manifest=root/'docs/cover-asset-manifest.json'
if manifest.exists(): rows=json.loads(manifest.read_text())
else:
 old=json.loads((root/'docs/recovered-cover-artwork.json').read_text());by={r['id']:r for r in old};rows=[]
 for i in range(40,136):
  path=by[i]['file'] if i in by else f'assets/collection/cover-{i}.svg'
  rows.append({'id':i,'file':path,'source':by[i]['source'] if i in by else 'Existing procedural SVG'})
for r in rows:
 replacement=root/f"assets/collection/cover-{r['id']}-premium-v4.webp"
 if replacement.exists():r['file']=str(replacement.relative_to(root));r['source']='Targeted photorealistic replacement, 26 October 2026'
 b=(root/r['file']).read_bytes()
 if r['file'].endswith('.webp'):
  assert len(b)>1024 and b[:4]==b'RIFF' and b[8:12]==b'WEBP' and int.from_bytes(b[4:8],'little')+8==len(b), f"Incomplete WebP: {r['file']}"
 r['bytes']=len(b);r['sha256']=hashlib.sha256(b).hexdigest()
manifest.write_text(json.dumps(rows,indent=2)+'\n')
mapping={str(r['id']):r['file'] for r in rows}
p=root/'cover-library.js';s=p.read_text()
if '// COVER_ASSET_MAP_BEGIN' in s:s=re.sub(r'// COVER_ASSET_MAP_BEGIN.*?// COVER_ASSET_MAP_END', '// COVER_ASSET_MAP_BEGIN\nconst coverAssetFiles='+json.dumps(mapping,separators=(',',':'))+';\n// COVER_ASSET_MAP_END',s,flags=re.S)
else:
 pos=s.index('export const newCovers=');s=s[:pos]+'// COVER_ASSET_MAP_BEGIN\nconst coverAssetFiles='+json.dumps(mapping,separators=(',',':'))+';\n// COVER_ASSET_MAP_END\n'+s[pos:]
 start=s.index('file:`assets/collection/cover-',s.index('export const newCovers='));end=s.index(',featured:',start)
 s=s[:start]+"file:coverAssetFiles[40+g*8+v]+'?v=4'"+s[end:]
p.write_text(s)
p=root/'sw.js';s=p.read_text();asset_list='/* COVER_ASSET_LIST_BEGIN */'+','.join(json.dumps('./'+r['file']+'?v=4') for r in rows)+'/* COVER_ASSET_LIST_END */'
if '/* COVER_ASSET_LIST_BEGIN */' in s:s=re.sub(r'/\* COVER_ASSET_LIST_BEGIN \*/.*?/\* COVER_ASSET_LIST_END \*/',asset_list,s,flags=re.S)
else:
 a=s.index('...Array.from({length:96}');b=s.index(",'./dictation.js",a);s=s[:a]+asset_list+s[b:]
p.write_text(s)
p=root/'scripts/cover-artwork-audit.mjs';s=p.read_text().replace('../docs/recovered-cover-artwork.json','../docs/cover-asset-manifest.json');p.write_text(s)
assert len(rows)==96 and len(set(r['sha256'] for r in rows))==96
print(json.dumps({'covers':96,'raster':sum(r['file'].endswith('.webp') for r in rows),'bytes_verified':sum(r['bytes'] for r in rows)}))
