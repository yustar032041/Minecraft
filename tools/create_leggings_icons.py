#!/usr/bin/env python3
"""Generate set-matched 128px leggings icons from a shared illustrated source.

The detailed steel drawing is AI-generated and recolored from each existing
chestplate's palette; it is not 12 independently authored designs. Run after
create_ultimate_armor.py and create_series_armor.py (which write older icons).
Requires Pillow. This only updates icons and their maps, not worn armor UVs.
"""
from pathlib import Path
from statistics import median
from PIL import Image
from import_item_art import cut_out,save_with_maps

ROOT=Path(__file__).resolve().parents[1]
RP=ROOT/'Hakkai_v7.1.0/ResourcePack'
source=ROOT/'tools/art_templates/leggings_steel_source.png'
base=cut_out(source)
# Sample the inner chest area to avoid the small series badges around its edge.
def palette(path):
 im=Image.open(path).convert('RGBA').crop((24,20,105,110))
 pixels=[(r,g,b) for r,g,b,a in im.getdata() if a>=200 and 45<=max(r,g,b)<=205]
 if not pixels:raise ValueError(f'no palette pixels in {path}')
 return tuple(median(p[i] for p in pixels) for i in range(3))
def icon_for(reference):
 target=palette(reference);baseline=palette(RP/'textures/items/hakkai_gear_010.png')
 # Keep shading intact, apply restrained palette offsets per RGB channel.
 shift=[max(-35,min(35,(target[i]-baseline[i])*.8)) for i in range(3)]
 im=base.copy();p=im.load()
 for y in range(im.height):
  for x in range(im.width):
   r,g,b,a=p[x,y]
   if a:p[x,y]=(max(0,min(255,round(r+shift[0]))),max(0,min(255,round(g+shift[1]))),max(0,min(255,round(b+shift[2]))),a)
 # Reuse the matching chestplate's corner insignia, making sets easier to
 # identify without obscuring the leggings silhouette.
 ref=Image.open(reference).convert('RGBA')
 for x,y in ((0,0),(103,0),(0,103),(103,103)):
  im.alpha_composite(ref.crop((x,y,x+25,y+25)),(x,y))
 return im
if __name__=='__main__':
 for i in range(11):
  save_with_maps(icon_for(RP/f'textures/items/hakkai_gear_{10+16*i:03}.png'),RP/f'textures/items/hakkai_series_leggings_{i:02}.png')
 save_with_maps(icon_for(RP/'textures/items/hakkai_ult_chest.png'),RP/'textures/items/hakkai_ult_leggings.png')
 print('12 set-matched leggings inventory icons generated; worn armor unchanged')
