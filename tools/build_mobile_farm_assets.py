#!/usr/bin/env python3
"""Generate an inert harvester head for the existing linear gantry."""
from pathlib import Path
import json
from PIL import Image,ImageDraw
r=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=r/'BehaviorPack';rp=r/'ResourcePack'
def load(p):return json.loads(p.read_text(encoding='utf8'))
def save(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
name='gantry_harvester';j=load(bp/'blocks/gantry_frame.json');b=j['minecraft:block'];b['description']['identifier']='hakkai:'+name;b['components']['minecraft:display_name']='tile.hakkai:'+name+'.name';b['components']['minecraft:loot']='loot_tables/hakkai/blocks/'+name+'.json';b['components']['minecraft:material_instances']['*']['texture']='hakkai_'+name;save(bp/f'blocks/{name}.json',j)
save(bp/f'loot_tables/hakkai/blocks/{name}.json',{'pools':[{'rolls':1,'entries':[{'type':'item','name':'hakkai:'+name}]}]})
save(bp/f'recipes/{name}.json',{'format_version':'1.21.90','minecraft:recipe_shapeless':{'description':{'identifier':'hakkai:'+name},'tags':['crafting_table'],'ingredients':[{'item':x} for x in ['hakkai:gantry_frame','minecraft:iron_hoe','minecraft:shears']],'result':{'item':'hakkai:'+name,'count':1}}})
a=rp/'textures/terrain_texture.json';atlas=load(a);atlas['texture_data']['hakkai_'+name]={'textures':'textures/blocks/hakkai_'+name};save(a,atlas)
im=Image.new('RGBA',(32,32),'#433b2d');d=ImageDraw.Draw(im);d.rectangle((1,1,30,30),outline='#eed290',width=2);d.rectangle((5,5,26,17),fill='#689453',outline='#b4d99c',width=2);d.polygon([(4,21),(8,27),(12,21),(16,27),(20,21),(24,27),(28,21)],fill='#e1d3ae');im.save(rp/f'textures/blocks/hakkai_{name}.png',optimize=True)
for lang,label in [('ja_JP','可動収穫ヘッド'),('en_US','Mobile Harvester Head')]:
 p=rp/f'texts/{lang}.lang';key='tile.hakkai:'+name+'.name=';lines=[x for x in p.read_text(encoding='utf8').splitlines() if not x.startswith(key)];p.write_text('\n'.join(lines)+'\n'+key+label+'\n',encoding='utf8')
