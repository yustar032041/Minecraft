#!/usr/bin/env python3
"""Generate 512px held-weapon atlas variants from existing 256px atlases.

Each color/normal/MER map keeps the original UV footprint. Subpixel engraving
and shading are procedural, not hand-painted; inventory icons are untouched.
Run after create_weapon_relief.py and create_final_held_models.py. Requires Pillow.
"""
import json,re
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1];PACK=ROOT/'Hakkai_v7.1.0';RP=PACK/'ResourcePack'
SOURCE=RP/'textures/hakkai/equipment';OUT=RP/'textures/hakkai/weapon_detail';OUT.mkdir(parents=True,exist_ok=True)
data=(PACK/'BehaviorPack/scripts/data.js').read_text(encoding='utf8')
catalog=json.loads(re.search(r'export const catalog=(\[.*?\]);',data).group(1))
kinds={'剣','斧','弓','杖','ハンマー','槍','盾','扇'}
weapons=[g for g in catalog if g['kind'] in kinds]
geo=json.loads((RP/'models/entity/hakkai_weapon_relief.geo.json').read_text())['minecraft:geometry']
models={g['description']['identifier']:g for g in geo}
def render(g):
 name=g['id'];n=int(g['number']);source=Image.open(SOURCE/f'{name}.png').convert('RGBA')
 if source.size!=(256,256):raise ValueError(f'{name}: unexpected source atlas size')
 image=source.resize((512,512),Image.Resampling.NEAREST)
 # Restrict every change to pixels already covered by the original alpha map.
 pix=image.load();bbox=image.getbbox()
 if not bbox:raise ValueError(f'{name}: empty atlas')
 for y in range(bbox[1],bbox[3]):
  for x in range(bbox[0],bbox[2]):
   r,gc,b,a=pix[x,y]
   if not a:continue
   # Fine machining/grain; small enough to retain the original color identity.
   line=((x+2*y+n)%19==0) - ((2*x-y+n)%23==0)
   weave=1 if (x%8 in (1,2) and y%8 in (2,3)) else -1 if (x%8==7 and y%8==7) else 0
   delta=line*5+weave*3
   pix[x,y]=(max(0,min(255,r+delta)),max(0,min(255,gc+delta)),max(0,min(255,b+delta)),a)
 # Thin inset edging for the large UV faces in the underlying kind/rank model.
 # Scale is in the geometry's 512px virtual UV units. Avoid adding alpha.
 mask=image.getchannel('A');overlay=Image.new('RGBA',image.size);draw=ImageDraw.Draw(overlay)
 model=models[f"geometry.hakkai.weapon_{name}"]
 seen=set()
 for cube in model['bones'][0]['cubes']:
  for face in cube['uv'].values():
   x,y=face['uv'];w,h=face['uv_size']
   x,y,w,h=x/2,y/2,w/2,h/2
   key=(round(x),round(y),round(w),round(h))
   if key in seen or w<14 or h<12:continue
   seen.add(key);x,y,w,h=key
   if x<0 or y<0 or x+w>512 or y+h>512:raise ValueError(f'{name}: UV out of bounds')
   draw.rectangle((x+1,y+1,x+w-2,y+h-2),outline=(238,232,213,30),width=1)
   if w>=20 and h>=20:
    cx=x+w//2;cy=y+h//2
    draw.line((cx-3,cy,cx+3,cy),fill=(245,235,212,42),width=1)
    draw.line((cx,cy-3,cx,cy+3),fill=(245,235,212,42),width=1)
 overlay.putalpha(Image.composite(overlay.getchannel('A'),Image.new('L',image.size),mask))
 image=Image.alpha_composite(image,overlay);image.save(OUT/f'{name}.png',optimize=True)
 # Keep the authored normal and MER appearance, remapped to the same pixels.
 for suffix in ('_n','_mer'):
  im=Image.open(SOURCE/f'{name}{suffix}.png').convert('RGBA')
  if im.size!=(256,256):raise ValueError(f'{name}{suffix}: unexpected size')
  im.resize((512,512),Image.Resampling.NEAREST).save(OUT/f'{name}{suffix}.png',optimize=True)
 texture_set={'format_version':'1.16.100','minecraft:texture_set':{'color':name,'normal':name+'_n','metalness_emissive_roughness':name+'_mer'}}
 (OUT/f'{name}.texture_set.json').write_text(json.dumps(texture_set,indent=2)+'\n',encoding='utf8')
 # Change held model only. Other attachables, icons and old equipment textures
 # retain their original asset, so armor and inventories do not change.
 path=RP/'attachables'/f'{name}.json';attach=json.loads(path.read_text(encoding='utf8'))
 attach['minecraft:attachable']['description']['textures']['default']='textures/hakkai/weapon_detail/'+name
 path.write_text(json.dumps(attach,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
for g in weapons:render(g)
for name,source in [('ult_sword','gear_144'),('ult_axe','gear_145'),('ult_pickaxe','gear_145')]:
 path=RP/'attachables'/f'{name}.json';attach=json.loads(path.read_text(encoding='utf8'))
 attach['minecraft:attachable']['description']['textures']['default']='textures/hakkai/weapon_detail/'+source
 path.write_text(json.dumps(attach,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(f'{len(weapons)} 512px weapon atlases with procedural relief; source textures retained')
