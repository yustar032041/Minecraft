#!/usr/bin/env python3
"""Generate restricted moving frame, panel, and six powered linear drives."""
from pathlib import Path
import json
from PIL import Image,ImageDraw
r=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=r/'BehaviorPack';rp=r/'ResourcePack'
def read(p):return json.loads(p.read_text(encoding='utf8'))
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
atlaspath=rp/'textures/terrain_texture.json';atlas=read(atlaspath)
def gen(name,label,kind,parts):
 j=read(bp/'blocks/factory_pipe.json');b=j['minecraft:block'];b['description']['identifier']='hakkai:'+name;b['components']['minecraft:display_name']='tile.hakkai:'+name+'.name';b['components']['minecraft:loot']='loot_tables/hakkai/blocks/'+name+'.json';b['components']['minecraft:material_instances']['*']['texture']='hakkai_'+name
 b['components'].pop('hakkai:factory');b['components'].pop('minecraft:tick')
 if kind=='drive':b['description']['states']={'hakkai:offset':list(range(9)),'hakkai:motion':[0,1,2]};b['components']['minecraft:tick']={'interval_range':[8,10],'looping':True};b['components']['hakkai:gantry']={}
 write(bp/f'blocks/{name}.json',j)
 write(bp/f'loot_tables/hakkai/blocks/{name}.json',{'pools':[{'rolls':1,'entries':[{'type':'item','name':'hakkai:'+name}]}]})
 write(bp/f'recipes/{name}.json',{'format_version':'1.21.90','minecraft:recipe_shapeless':{'description':{'identifier':'hakkai:'+name},'tags':['crafting_table'],'ingredients':[{'item':x} for x in parts],'result':{'item':'hakkai:'+name,'count':1}}})
 im=Image.new('RGBA',(32,32),'#543f30');d=ImageDraw.Draw(im);d.rectangle((1,1,30,30),outline='#edc780',width=3)
 if kind=='frame':d.line((5,5,26,26),fill='#d9b674',width=4);d.line((26,5,5,26),fill='#d9b674',width=4);d.ellipse((12,12,20,20),fill='#586c71')
 elif kind=='panel':d.rectangle((5,5,26,26),fill='#b48c54',outline='#eacb89',width=2);d.line((5,13,26,13),fill='#654b33',width=2);d.line((5,21,26,21),fill='#654b33',width=2)
 else:d.rectangle((6,6,25,25),fill='#486970',outline='#e8c988',width=2);d.line((8,16,23,16),fill='#dff5ed',width=3);d.polygon([(23,16),(17,11),(17,21)],fill='#dff5ed')
 im.save(rp/f'textures/blocks/hakkai_{name}.png',optimize=True);atlas['texture_data']['hakkai_'+name]={'textures':'textures/blocks/hakkai_'+name}
 for language in ('ja_JP','en_US'):
  p=rp/f'texts/{language}.lang';s=p.read_text(encoding='utf8').rstrip();line=f'tile.hakkai:{name}.name={label}'
  if line not in s:p.write_text(s+'\n'+line+'\n',encoding='utf8')
gen('gantry_frame','移動フレーム','frame',['minecraft:iron_ingot','minecraft:oak_planks'])
gen('gantry_panel','移動パネル','panel',['hakkai:gantry_frame','minecraft:oak_planks'])
for suffix,label,ingredient in [('', '東',None),('_west','西','minecraft:redstone'),('_north','北','minecraft:flint'),('_south','南','minecraft:string'),('_up','上','minecraft:feather'),('_down','下','minecraft:gravel')]:
 gen('gantry'+suffix,'動力移動装置（'+label+'向き）','drive',['hakkai:gantry',ingredient] if ingredient else ['hakkai:shaft','minecraft:piston','minecraft:iron_ingot'])
write(atlaspath,atlas)
