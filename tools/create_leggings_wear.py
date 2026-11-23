#!/usr/bin/env python3
"""Match leg atlas faces to their set's chest-arm material and add player offset.

Uses each chestplate's original color/normal/MER images. Minecraft's armor UV
layout is 64x32; maps may be scaled. This is an unverified rendering change.
Run after create_ultimate_armor.py and create_series_armor.py. Requires Pillow.
"""
from pathlib import Path
import json
from PIL import Image
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack'
eq=root/'textures/hakkai/equipment';attach=root/'attachables'

def update(name,chest):
 for suffix in ('','_n','_mer'):
  with Image.open(eq/(chest+suffix+'.png')) as source:
   image=source.convert('RGBA');w,h=image.size
   if w%64 or h%32:raise ValueError(f'{chest}{suffix}: unsupported UV dimensions')
   sx,sy=w//64,h//32
   # Leg cube UV [0,16] uses the same 16x16 pixel net as the arm cube [40,16].
   image.paste(image.crop((40*sx,16*sy,56*sx,32*sy)),(0,16*sy))
   image.save(eq/(name+suffix+'.png'))
 path=attach/(name+'.json');obj=json.loads(path.read_text(encoding='utf8'));desc=obj['minecraft:attachable']['description']
 desc['scripts']['animate']=['offset'];desc['animations']={'offset':'animation.armor.leggings.offset'}
 path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
if __name__=='__main__':
 for i in range(11):update(f'series_leggings_{i:02}',f'gear_{10+16*i:03}')
 update('ult_leggings','ult_chest')
 print('12 leggings: matching chest arm UVs and player offset (rendering not verified)')
