#!/usr/bin/env python3
"""Generate farm machines and a bounded, powered branching item duct system."""
from pathlib import Path
import json
from PIL import Image,ImageDraw
r=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=r/'BehaviorPack';rp=r/'ResourcePack'
def read(p):return json.loads(p.read_text(encoding='utf8'))
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
ap=rp/'textures/terrain_texture.json';atlas=read(ap)
def gen(name,label,parts,style,color):
 base='mixer' if style=='farm' else 'factory_pipe';j=read(bp/f'blocks/{base}.json');b=j['minecraft:block'];b['description']['identifier']='hakkai:'+name;b['components']['minecraft:display_name']=f'tile.hakkai:{name}.name';b['components']['minecraft:loot']=f'loot_tables/hakkai/blocks/{name}.json';b['components']['minecraft:material_instances']['*']['texture']='hakkai_'+name
 if style=='duct':b['components'].pop('minecraft:tick');b['components'].pop('hakkai:factory')
 elif style=='extractor':b['components']['minecraft:tick']['interval_range']=[8,10]
 if style=='farm':
  for permutation in b['permutations']:permutation['components']['minecraft:material_instances']['*']['texture']='hakkai_'+name
 write(bp/f'blocks/{name}.json',j)
 write(bp/f'loot_tables/hakkai/blocks/{name}.json',{'pools':[{'rolls':1,'entries':[{'type':'item','name':'hakkai:'+name}]}]})
 write(bp/f'recipes/{name}.json',{'format_version':'1.21.90','minecraft:recipe_shapeless':{'description':{'identifier':'hakkai:'+name},'tags':['crafting_table'],'ingredients':[{'item':v} for v in parts],'result':{'item':'hakkai:'+name,'count':1}}})
 im=Image.new('RGBA',(32,32),'#4b4033');d=ImageDraw.Draw(im);d.rectangle((1,1,30,30),outline='#dcc090',width=2)
 if style=='farm':
  d.rectangle((5,5,26,26),fill=color,outline='#d6dda1',width=2);d.line((16,25,16,9),fill='#f5dc9e',width=3);d.polygon([(15,15),(7,10),(7,15),(15,20)],fill='#a6df83');d.polygon([(17,13),(25,7),(25,12),(17,18)],fill='#bee596')
 elif style=='duct':
  d.rectangle((0,11,31,21),fill=color,outline='#d8caac',width=2);d.rectangle((11,0,21,31),fill=color,outline='#d8caac',width=2);d.rectangle((12,12,20,20),fill='#f0dfb0')
 else:d.ellipse((5,5,26,26),fill=color,outline='#e6cb94',width=3);d.line((8,16,23,16),fill='#f7f0da',width=3);d.polygon([(24,16),(17,10),(17,22)],fill='#f7f0da')
 im.save(rp/f'textures/blocks/hakkai_{name}.png',optimize=True);atlas['texture_data']['hakkai_'+name]={'textures':'textures/blocks/hakkai_'+name}
 english={'farm_harvester':'Powered Harvester','farm_planter':'Powered Planter','farm_fertilizer':'Powered Fertilizer','item_duct':'Item Duct','item_extractor':'Powered Extractor (East)','item_extractor_west':'Powered Extractor (West)','item_extractor_north':'Powered Extractor (North)','item_extractor_south':'Powered Extractor (South)','item_extractor_up':'Powered Extractor (Up)','item_extractor_down':'Powered Extractor (Down)'}
 for lang in ('ja_JP','en_US'):
  p=rp/f'texts/{lang}.lang';lines=p.read_text(encoding='utf8').splitlines();key=f'tile.hakkai:{name}.name=';line=key+(label if lang=='ja_JP' else english[name]);lines=[x for x in lines if not x.startswith(key)];p.write_text('\n'.join(lines)+'\n'+line+'\n',encoding='utf8')
gen('farm_harvester','動力収穫機',['minecraft:iron_hoe','hakkai:shaft','minecraft:hopper'],'farm','#71904d')
gen('farm_planter','動力播種機',['minecraft:wheat_seeds','hakkai:shaft','minecraft:hopper'],'farm','#a17c50')
gen('farm_fertilizer','動力施肥機',['minecraft:bone_meal','hakkai:shaft','minecraft:bucket'],'farm','#609095')
gen('item_duct','アイテム搬送ダクト',['minecraft:copper_ingot','minecraft:iron_nugget','minecraft:glass','minecraft:redstone'],'duct','#a57752')
for suffix,label,part,color in [('', '東',None,'#b18b53'),('_west','西','minecraft:redstone','#ba6758'),('_north','北','minecraft:flint','#829eab'),('_south','南','minecraft:string','#c0b586'),('_up','上','minecraft:feather','#8dc0c8'),('_down','下','minecraft:gravel','#8c7c6c')]:
 gen('item_extractor'+suffix,'動力搬出機（'+label+'行き）',['hakkai:item_extractor',part] if part else ['minecraft:hopper','hakkai:shaft','hakkai:item_duct'],'extractor',color)
write(ap,atlas)
