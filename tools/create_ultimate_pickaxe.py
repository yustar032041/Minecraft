#!/usr/bin/env python3
"""Create the prototype final pickaxe and inventory icon (Pillow required)."""
raise SystemExit("Historical generator would overwrite current item and artwork; use tools/render_final_pickaxe_revision.py --write for the icon only")
from pathlib import Path
import json
from PIL import Image,ImageDraw
from import_item_art import save_with_maps
root=Path(__file__).resolve().parents[1];bp=root/'Hakkai_v7.1.0/BehaviorPack';rp=root/'Hakkai_v7.1.0/ResourcePack'
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
name='ult_pickaxe';ident='hakkai:'+name
comps={'minecraft:display_name':{'value':'item.'+ident+'.name'},'minecraft:icon':'hakkai_'+name,'minecraft:max_stack_size':1,'minecraft:hand_equipped':True,'minecraft:damage':7,'minecraft:durability':{'max_durability':2500},'minecraft:enchantable':{'slot':'pickaxe','value':15},'minecraft:tags':{'tags':['minecraft:is_pickaxe','minecraft:is_tool','minecraft:digger','minecraft:netherite_tier']},'minecraft:digger':{'use_efficiency':True,'destroy_speeds':[{'block':{'tags':"q.any_tag('minecraft:is_pickaxe_item_destructible')"},'speed':10}]+[{'block':f'hakkai:ore_{i}','speed':10} for i in range(20)]}}
write(bp/'items'/f'{name}.json',{'format_version':'1.26.60','minecraft:item':{'description':{'identifier':ident,'menu_category':{'category':'equipment','group':'minecraft:itemGroup.name.pickaxe'}},'components':comps}})
write(bp/'recipes'/f'{name}.json',{'format_version':'1.21.90','minecraft:recipe_shapeless':{'description':{'identifier':ident},'tags':['crafting_table'],'ingredients':[{'item':x} for x in ['minecraft:netherite_pickaxe','hakkai:warden_core','hakkai:crystal_7','hakkai:shard_9']],'result':{'item':ident,'count':1}}})
im=Image.new('RGBA',(128,128));d=ImageDraw.Draw(im)
d.polygon([(22,109),(29,116),(83,60),(75,52)],fill=(81,48,103,255),outline=(230,187,97,255),width=3)
d.polygon([(31,111),(82,56),(86,60),(36,115)],fill=(141,98,151,255))
d.polygon([(34,57),(42,40),(55,28),(75,22),(99,28),(111,42),(115,56),(104,48),(93,43),(82,46),(74,56),(62,64),(54,61),(47,54)],fill=(47,31,76,255),outline=(226,185,100,255),width=3)
d.polygon([(41,53),(53,37),(72,29),(93,32),(105,41),(91,38),(76,40),(64,52),(53,55)],fill=(122,93,158,255));d.polygon([(70,30),(77,24),(84,31),(78,40),(71,39)],fill=(137,237,235,255),outline=(240,225,164,255));d.line([(39,53),(52,46),(62,45)],fill=(220,197,154,255),width=2)
px=im.load()
for y in range(128):
 for x in range(128):
  r,g,b,a=px[x,y]
  if a:
   n=((x*13+y*7+(x*y)%11)%11)-5;px[x,y]=(max(0,min(255,r+n)),max(0,min(255,g+n)),max(0,min(255,b+n)),a)
save_with_maps(im,rp/'textures/items/hakkai_ult_pickaxe.png')
a=rp/'textures/item_texture.json';atlas=json.loads(a.read_text());atlas['texture_data']['hakkai_'+name]={'textures':'textures/items/hakkai_'+name};write(a,atlas)
p=root/'texture_progress.json';progress=json.loads(p.read_text());
if name not in progress['derived_extra_existing']:progress['derived_extra_existing'].append(name)
if name in progress['planned_art_only']:progress['planned_art_only'].remove(name)
write(p,progress)
for lang,label in [('ja_JP','終刻のツルハシ'),('en_US','Final Hour Pickaxe')]:
 p=rp/'texts'/f'{lang}.lang';lines=p.read_text(encoding='utf8').splitlines();key=f'item.{ident}.name=';p.write_text('\n'.join([line for line in lines if not line.startswith(key)]+[key+label])+'\n',encoding='utf8')
print('Final pickaxe: item, recipe, icon and 20 explicit custom ores')
