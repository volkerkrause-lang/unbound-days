"""Compile matching ink and blind maker-mark tones from existing artwork; never edits images."""
import json
import pathlib
import re
from PIL import Image, ImageStat

root = pathlib.Path(__file__).resolve().parents[1]
legacy = ['leather-saddle','leather-oxblood','leather-black','leather-ivory','leather-vintage','steampunk','rococo','titanium','japanese','marquetry','moonstone','velvet','steampunk-luxe','gold-filigree-luxe','navy-leather-luxe','oxblood-leather-luxe','clockwork-clasp-v2','gold-phoenix-v2','turquoise-filigree-v2','black-clasp-v2']
files = {i: f'assets/cover-{i:02d}-premium-v3.webp' for i in range(21)}
files.update({i: f'assets/{legacy[i-20]}.webp' for i in range(21,40)})
files.update({r['id']: r['file'] for r in json.loads((root/'docs/cover-asset-manifest.json').read_text())})

def luminance(rgb):
    channels = [v/255 for v in rgb]
    return sum(weight*(v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4)
               for weight,v in zip((.2126,.7152,.0722),channels))

def contrast(a,b):
    low,high = sorted((luminance(a),luminance(b)))
    return (high+.05)/(low+.05)

def mix(a,b,t):
    return tuple(round(x*(1-t)+y*t) for x,y in zip(a,b))

def colour(rgb):
    return '#'+''.join(f'{v:02x}' for v in rgb)

tones = {}
for id,path in sorted(files.items()):
    with Image.open(root/path) as image:
        image = image.convert('RGB')
        w,h = image.size
        group = (id-40)//8 if id >= 40 else None
        left = id >= 40 and group not in (0,4,6)
        x = .395 if left else .5
        face_box = (int(w*(x-.18)),int(h*.18),int(w*(x+.18)),int(h*.60))
        face = tuple(ImageStat.Stat(image.crop(face_box)).median)
        candidates = [mix(face,(255,255,255),.85),mix(face,(0,0,0),.82)]
        ink = max(candidates,key=lambda c:contrast(c,face))
        if contrast(ink,face) < 4.5:
            ink = max(((0,0,0),(255,255,255)),key=lambda c:contrast(c,face))
        y = .765 if left else .885
        brand_box = (int(w*(x-.09)),int(h*(y-.025)),int(w*(x+.09)),int(h*(y+.025)))
        base = tuple(ImageStat.Stat(image.crop(brand_box)).median)
        mark = mix(base,(255,255,255) if luminance(base)<.18 else (0,0,0),.27)
        tones[id] = [colour(ink),colour(mark)]

assert len(tones) == 136
source = root/'cover-library.js'
text = source.read_text()
block = '// COVER_INK_TONES_BEGIN\nconst coverInkTones='+json.dumps(tones,separators=(',',':'))+';\n// COVER_INK_TONES_END'
if '// COVER_INK_TONES_BEGIN' in text:
    text = re.sub(r'// COVER_INK_TONES_BEGIN.*?// COVER_INK_TONES_END',block,text,flags=re.S)
else:
    text = text.replace('// Physical substrate drives both the personal lettering and permanent brand.',block+'\n// Physical substrate drives both the personal lettering and permanent brand.')
source.write_text(text)
print('Compiled matching lettering and independent blind-brand tones for 136 covers.')
