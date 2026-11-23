#!/usr/bin/env python3
"""Create provisional realm travel icons. Images only; no item behavior."""
import json
from PIL import Image
from render_gear_icons import ROOT, PACK, ITEMS, draw_attribute
from render_extra_item_icons import recolor, REALM_ATTRS
from import_item_art import save_with_maps

def render_all():
 result={}
 for kind,source in [('realm_guide','guide'),('realm_return_stone','return_stone')]:
  base=Image.open(ITEMS/f'hakkai_{source}.png').convert('RGBA')
  for realm,attr in enumerate(REALM_ATTRS):
   im=recolor(base,attr,.6)
   im.alpha_composite(draw_attribute(attr,24),(2,3))
   if realm==7:im.alpha_composite(draw_attribute(9,18),(107,105))
   result[f'{kind}_{realm}']=im
 return result

def main():
 pp=ROOT/'texture_progress.json';progress=json.loads(pp.read_text(encoding='utf8'))
 atlas_path=PACK/'ResourcePack/textures/item_texture.json';atlas=json.loads(atlas_path.read_text(encoding='utf8'))
 made=render_all()
 for name,image in made.items():
  assert not (PACK/'BehaviorPack/items'/(name+'.json')).exists(),f'{name} already implemented; update tracking'
  save_with_maps(image,ITEMS/('hakkai_'+name+'.png'))
  atlas['texture_data']['hakkai_'+name]={'textures':'textures/items/hakkai_'+name}
 atlas_path.write_text(json.dumps(atlas,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 progress['planned_art_only']=list(dict.fromkeys(progress['planned_art_only']+list(made)))
 pp.write_text(json.dumps(progress,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print(f'{len(made)} planned travel icons added; no items or behavior implemented')
if __name__=='__main__':main()
