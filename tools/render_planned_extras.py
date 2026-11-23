#!/usr/bin/env python3
"""Prepare unused planned item art from type templates; no gameplay added.

Equipment icons are 128px inventory images, not 256px wearable textures.
Pickaxe and leggings are intentionally left out until appropriate art exists.
"""
import json
from PIL import Image
from render_gear_icons import ROOT, PACK, ITEMS, TEMPLATES, make_icon, draw_attribute
from render_extra_item_icons import recolor
from import_item_art import save_with_maps

GEAR={'ult_sword':'sword','ult_axe':'axe','ult_helmet':'helmet','ult_chest':'chest','ult_boots':'boots'}
MAGIC={'magic_kaze':0,'magic_mizu':1,'magic_homura':2,'magic_hikari':5,'magic_tsuki':6,'magic_kizuna':9}

def render_all():
 result={}
 for name,template in GEAR.items():
  base=Image.open(TEMPLATES/f'{template}.png').convert('RGBA')
  result[name]=make_icon(base,9,5,3)
 stone=Image.open(TEMPLATES/'stone.png').convert('RGBA')
 for name,attr in MAGIC.items():
  im=recolor(stone,attr,.75);im.alpha_composite(draw_attribute(attr,32),(4,3));result[name]=im
 core=Image.open(TEMPLATES/'core.png').convert('RGBA')
 im=recolor(core,7,.62);im.alpha_composite(draw_attribute(7,24),(3,3));result['warden_core']=im
 return result

def main():
 pp=ROOT/'texture_progress.json';progress=json.loads(pp.read_text(encoding='utf8'))
 atlas_path=PACK/'ResourcePack/textures/item_texture.json';atlas=json.loads(atlas_path.read_text(encoding='utf8'))
 made=render_all()
 for name,image in made.items():
  if (PACK/'BehaviorPack/items'/(name+'.json')).exists():continue  # implemented assets are never overwritten
  save_with_maps(image,ITEMS/('hakkai_'+name+'.png'))
  atlas['texture_data']['hakkai_'+name]={'textures':'textures/items/hakkai_'+name}
 atlas_path.write_text(json.dumps(atlas,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 progress['planned_art_only']=list(dict.fromkeys(progress['planned_art_only']+[name for name in made if not (PACK/'BehaviorPack/items'/(name+'.json')).exists()]))
 pp.write_text(json.dumps(progress,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print(f'{sum(1 for name in made if not (PACK/"BehaviorPack/items"/(name+".json")).exists())} planned inventory icons prepared; implemented icons left unchanged')
if __name__=='__main__':main()
