#!/usr/bin/env python3
"""Create three prototype companion pieces for each guardian armor family.

Icons recolor existing art and worn textures are copied from the matching
existing chestplate. They are not newly authored high-resolution designs.
Requires Pillow. Does not modify existing chestplates or progression.
"""
# Historical generator: it replaces current item art and/or wearable assets.
import sys
if __name__ == '__main__' and '--allow-legacy-overwrite' not in sys.argv:
 raise SystemExit('Legacy generator would overwrite current armor. Pass --allow-legacy-overwrite explicitly; rebuild current armor afterwards.')

import json,shutil,subprocess,sys
from pathlib import Path
from PIL import Image
from render_extra_item_icons import recolor, REALM_ATTRS
from import_item_art import save_with_maps
ROOT=Path(__file__).resolve().parents[1];bp=ROOT/'Hakkai_v7.1.0/BehaviorPack';rp=ROOT/'Hakkai_v7.1.0/ResourcePack'
def write(path,data):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
atlas_path=rp/'textures/item_texture.json';atlas=json.loads(atlas_path.read_text())
progress_path=ROOT/'texture_progress.json';progress=json.loads(progress_path.read_text())
parts=[('helmet','頭','head','armor_head','diamond_helmet','gear_011',3),('leggings','脚','legs','armor_legs','diamond_leggings','series_leggings_00',5),('boots','足','feet','armor_feet','diamond_boots','gear_012',2)]
names=['翠嵐','霧晶','金砂','氷華','紫電','深翠','天翼','時環']
en=['Verdant Gale','Mist Crystal','Golden Sand','Ice Blossom','Violet Lightning','Deep Jade','Sky Wing','Time Ring']
texts={lang:(rp/'texts'/f'{lang}.lang').read_text().splitlines() for lang in ('ja_JP','en_US')}
for i in range(8):
 for part,ja,slot,enchant,base,icon,protection in parts:
  id=f'guardian_armor_{i}_{part}';ident='hakkai:'+id
  write(bp/'items'/f'{id}.json',{'format_version':'1.26.60','minecraft:item':{'description':{'identifier':ident},'components':{'minecraft:display_name':{'value':f'item.{ident}.name'},'minecraft:icon':'hakkai_'+id,'minecraft:max_stack_size':1,'minecraft:wearable':{'slot':'slot.armor.'+slot,'protection':protection},'minecraft:durability':{'max_durability':500},'minecraft:enchantable':{'slot':enchant,'value':12}}}})
  ingredients=['minecraft:'+base,f'hakkai:crystal_{i}',f'hakkai:shard_{i}','minecraft:emerald']
  write(bp/'recipes'/f'{id}.json',{'format_version':'1.21.90','minecraft:recipe_shapeless':{'description':{'identifier':ident},'tags':['crafting_table'],'ingredients':[{'item':x} for x in ingredients],'result':{'item':ident,'count':1}}})
  source={'helmet':'gear_011','leggings':'series_leggings_00','boots':'gear_012'}[part];a=json.loads((rp/'attachables'/f'{source}.json').read_text());desc=a['minecraft:attachable']['description'];desc['identifier']=ident;desc['textures']['default']='textures/hakkai/equipment/'+id;write(rp/'attachables'/f'{id}.json',a)
  for suffix in ['.png','_n.png','_mer.png']:shutil.copyfile(rp/'textures/hakkai/equipment'/f'gear_{188+i}{suffix}',rp/'textures/hakkai/equipment'/f'{id}{suffix}')
  write(rp/'textures/hakkai/equipment'/f'{id}.texture_set.json',{'format_version':'1.16.100','minecraft:texture_set':{'color':id,'normal':id+'_n','metalness_emissive_roughness':id+'_mer'}})
  icon_image=recolor(Image.open(rp/'textures/items'/f'hakkai_{icon}.png').convert('RGBA'),REALM_ATTRS[i],.38)
  save_with_maps(icon_image,rp/'textures/items'/f'hakkai_{id}.png');atlas['texture_data']['hakkai_'+id]={'textures':'textures/items/hakkai_'+id}
  if id not in progress['derived_extra_existing']:progress['derived_extra_existing'].append(id)
  for lang,label in [('ja_JP',f'{names[i]}の覚醒装・{ja}'),('en_US',f'{en[i]} {part.title()}')]:
   key=f'item.{ident}.name=';texts[lang]=[line for line in texts[lang] if not line.startswith(key)];texts[lang].append(key+label)
for lang,lines in texts.items():(rp/'texts'/f'{lang}.lang').write_text('\n'.join(lines)+'\n')
write(atlas_path,atlas);write(progress_path,progress)
subprocess.run([sys.executable,str(ROOT/'tools/organize_armor_series.py')],check=True)
print('24 guardian companion pieces created (prototype recolors)')
