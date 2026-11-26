#!/usr/bin/env python3
"""Build repeatable prototype companion pieces; preserve unique chest progression."""
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
parts=[('helmet','兜','head','armor_head','iron_helmet','gear_011',3),('leggings','レギンス','legs','armor_legs','iron_leggings','series_leggings_00',5),('boots','靴','feet','armor_feet','iron_boots','gear_012',2)]
# Additional pieces do not consume unique boss cores or one-time chests.
sets=[('nightwalker','夜渡り装','Nightwalker',186,6,['hakkai:crystal_6','hakkai:shard_18','minecraft:emerald']),('united','八界統合装','Eight Realms United',212,7,['hakkai:crystal_7','hakkai:chronicle_fragment','minecraft:emerald'])]
texts={lang:(rp/'texts'/f'{lang}.lang').read_text().splitlines() for lang in ('ja_JP','en_US')}
for family,ja_name,en_name,chest,color,materials in sets:
 for part,ja,slot,enchant,base,icon,protection in parts:
  base=base.replace('iron_', 'diamond_' if family=='nightwalker' else 'netherite_')
  id=f'{family}_armor_{part}';ident='hakkai:'+id
  write(bp/'items'/f'{id}.json',{'format_version':'1.26.60','minecraft:item':{'description':{'identifier':ident},'components':{'minecraft:display_name':{'value':f'item.{ident}.name'},'minecraft:icon':'hakkai_'+id,'minecraft:max_stack_size':1,'minecraft:wearable':{'slot':'slot.armor.'+slot,'protection':protection},'minecraft:durability':{'max_durability':500},'minecraft:enchantable':{'slot':enchant,'value':12}}}})
  write(bp/'recipes'/f'{id}.json',{'format_version':'1.21.90','minecraft:recipe_shapeless':{'description':{'identifier':ident},'tags':['crafting_table'],'ingredients':[{'item':x} for x in ['minecraft:'+base,*materials]],'result':{'item':ident,'count':1}}})
  a=json.loads((rp/'attachables'/f'{icon}.json').read_text());desc=a['minecraft:attachable']['description'];desc['identifier']=ident;desc['textures']['default']='textures/hakkai/equipment/'+id;write(rp/'attachables'/f'{id}.json',a)
  for suffix in ['.png','_n.png','_mer.png']:
   source=rp/'textures/hakkai/equipment'/f'gear_{chest}{suffix}'
   if not source.exists():source=rp/'textures/hakkai/equipment'/f'gear_186{suffix}'
   shutil.copyfile(source,rp/'textures/hakkai/equipment'/f'{id}{suffix}')
  write(rp/'textures/hakkai/equipment'/f'{id}.texture_set.json',{'format_version':'1.16.100','minecraft:texture_set':{'color':id,'normal':id+'_n','metalness_emissive_roughness':id+'_mer'}})
  save_with_maps(recolor(Image.open(rp/'textures/items'/f'hakkai_{icon}.png').convert('RGBA'),REALM_ATTRS[color],.61),rp/'textures/items'/f'hakkai_{id}.png');atlas['texture_data']['hakkai_'+id]={'textures':'textures/items/hakkai_'+id}
  if id not in progress['derived_extra_existing']:progress['derived_extra_existing'].append(id)
  for lang,label in [('ja_JP',f'{ja_name}の{ja}'),('en_US',f'{en_name} {part.title()}')]:
   key=f'item.{ident}.name=';texts[lang]=[line for line in texts[lang] if not line.startswith(key)];texts[lang].append(key+label)
for lang,lines in texts.items():(rp/'texts'/f'{lang}.lang').write_text('\n'.join(lines)+'\n')
write(atlas_path,atlas);write(progress_path,progress)
subprocess.run([sys.executable,str(ROOT/'tools/organize_armor_series.py')],check=True)
print('6 endgame companion pieces created (prototype recolors)')
