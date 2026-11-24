#!/usr/bin/env python3
"""Directional attachment joints and a powered, vertical-axis bearing."""
from pathlib import Path
import json
from PIL import Image,ImageDraw
r=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=r/'BehaviorPack';rp=r/'ResourcePack'
def read(p):return json.loads(p.read_text(encoding='utf8'))
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
a=rp/'textures/terrain_texture.json';atlas=read(a)
def make(name,label,parts,color,drive=False):
 j=read(bp/'blocks/gantry_frame.json');b=j['minecraft:block'];b['description']['identifier']='hakkai:'+name;b['components']['minecraft:display_name']='tile.hakkai:'+name+'.name';b['components']['minecraft:loot']='loot_tables/hakkai/blocks/'+name+'.json';b['components']['minecraft:material_instances']['*']['texture']='hakkai_'+name
 if drive:b['description']['states']={'hakkai:angle':[0,1,2,3],'hakkai:motion':[0,1,2]};b['components']['minecraft:tick']={'interval_range':[8,10],'looping':True};b['components']['hakkai:bearing']={}
 write(bp/f'blocks/{name}.json',j)
 write(bp/f'loot_tables/hakkai/blocks/{name}.json',{'pools':[{'rolls':1,'entries':[{'type':'item','name':'hakkai:'+name}]}]})
 write(bp/f'recipes/{name}.json',{'format_version':'1.21.90','minecraft:recipe_shapeless':{'description':{'identifier':'hakkai:'+name},'tags':['crafting_table'],'ingredients':[{'item':x} for x in parts],'result':{'item':'hakkai:'+name,'count':1}}})
 im=Image.new('RGBA',(32,32),'#4b4035');d=ImageDraw.Draw(im);d.rectangle((1,1,30,30),outline='#e1c28b',width=2)
 if drive:d.ellipse((5,5,26,26),fill='#55747a',outline='#ebc784',width=3);d.arc((9,9,22,22),30,320,fill='#e4f3ed',width=3);d.polygon([(23,9),(23,15),(17,10)],fill='#e4f3ed')
 else:d.rectangle((5,5,26,26),fill='#705b45',outline='#c9aa77',width=2);d.rectangle((9,9,22,22),fill=color);d.line((8,16,23,16),fill='#f4ead2',width=2);d.polygon([(23,16),(17,11),(17,21)],fill='#f4ead2')
 im.save(rp/f'textures/blocks/hakkai_{name}.png',optimize=True);atlas['texture_data']['hakkai_'+name]={'textures':'textures/blocks/hakkai_'+name}
 for lang in ('ja_JP','en_US'):
  p=rp/f'texts/{lang}.lang';s=p.read_text(encoding='utf8').rstrip();line=f'tile.hakkai:{name}.name={label}'
  if line not in s:p.write_text(s+'\n'+line+'\n',encoding='utf8')
for suffix,label,part,color in [('', '東',None,'#d9b15d'),('_west','西','minecraft:redstone','#d35e4d'),('_north','北','minecraft:flint','#829eab'),('_south','南','minecraft:string','#d6cd9a'),('_up','上','minecraft:feather','#8ccadf'),('_down','下','minecraft:gravel','#907f6e')]:
 make('gantry_joint'+suffix,'移動接合器（'+label+'側）',['hakkai:gantry_joint',part] if part else ['hakkai:gantry_frame','minecraft:slime_ball'],color)
make('bearing','動力回転台',['hakkai:shaft','minecraft:iron_ingot','minecraft:smooth_stone'],'#5c9295',True)
write(a,atlas)
