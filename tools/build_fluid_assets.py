#!/usr/bin/env python3
"""Generate water-network blocks, crafting, loot and original pixel textures."""
from pathlib import Path
import json
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=root/'BehaviorPack';rp=root/'ResourcePack'
def read(p):return json.loads(p.read_text(encoding='utf8'))
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
atlasp=rp/'textures/terrain_texture.json';atlas=read(atlasp)
def texture(name,kind,level=0):
 im=Image.new('RGBA',(32,32),'#474139');d=ImageDraw.Draw(im)
 d.rectangle((1,1,30,30),outline='#d9b881',width=2)
 if kind=='gear':
  d.rectangle((3,8,28,23),fill='#916f46',outline='#e6c28a',width=2);d.line((8,16,23,16),fill='#a6e3eb' if level==1 else '#f6d46d',width=3)
 elif kind in ('tank','lava_tank'):
  d.rectangle((5,4,26,27),fill='#202e32',outline='#9ec3c1',width=2)
  if level:d.rectangle((7,26-level*2,24,25),fill=('#e87722' if kind=='lava_tank' else '#47aace'));d.line((7,26-level*2,24,26-level*2),fill=('#ffdc70' if kind=='lava_tank' else '#a0efff'),width=1)
 elif kind=='pipe':
  d.rectangle((1,11,30,20),fill='#588c98',outline='#d2c19a',width=2);d.rectangle((11,1,20,30),fill='#588c98',outline='#d2c19a',width=2);d.ellipse((10,10,21,21),fill='#92dceb')
 elif kind=='pump':
  d.ellipse((5,5,26,26),fill='#385c64',outline='#dcbd79',width=3);d.line((8,16,24,16),fill='#d6f7fc',width=3);d.polygon([(24,16),(18,11),(18,21)],fill='#d6f7fc')
 else:
  d.rectangle((5,10,26,25),fill='#3a849b',outline='#e2c293',width=2);d.line((8,14,23,14),fill='#a3ecf6',width=2);d.rectangle((13,4,18,19),fill='#cfb274')
 im.save(rp/f'textures/blocks/hakkai_{name}.png',optimize=True);atlas['texture_data']['hakkai_'+name]={'textures':f'textures/blocks/hakkai_{name}'}
def material(key):return {'*':{'texture':'hakkai_'+key,'render_method':'opaque'}}
def loot(name):write(bp/f'loot_tables/hakkai/blocks/{name}.json',{'pools':[{'rolls':1,'entries':[{'type':'item','name':'hakkai:'+name}]}]})
def recipe(name,parts):write(bp/f'recipes/{name}.json',{'format_version':'1.21.90','minecraft:recipe_shapeless':{'description':{'identifier':'hakkai:'+name},'tags':['crafting_table'],'ingredients':[{'item':v} for v in parts],'result':{'item':'hakkai:'+name,'count':1}}})
def lang(name,label):
 for l in ('ja_JP','en_US'):
  p=rp/f'texts/{l}.lang';s=p.read_text(encoding='utf8').rstrip();line=f'tile.hakkai:{name}.name={label}'
  if line not in s:p.write_text(s+'\n'+line+'\n',encoding='utf8')
def basic(name,label,kind):
 j=read(bp/'blocks/factory_pipe.json');b=j['minecraft:block'];b['description']['identifier']='hakkai:'+name;b['components']['minecraft:display_name']=f'tile.hakkai:{name}.name';b['components']['minecraft:loot']=f'loot_tables/hakkai/blocks/{name}.json';b['components']['minecraft:material_instances']=material(name);texture(name,kind);loot(name);lang(name,label);return j
j=basic('fluid_pipe','液体管','pipe');j['minecraft:block']['components'].pop('minecraft:tick');j['minecraft:block']['components'].pop('hakkai:factory');write(bp/'blocks/fluid_pipe.json',j);recipe('fluid_pipe',['minecraft:copper_ingot','minecraft:glass','minecraft:iron_nugget'])
j=basic('fluid_tank','液体タンク','tank');b=j['minecraft:block'];b['components'].pop('minecraft:tick');b['description']['states']={'hakkai:level':list(range(9)),'hakkai:fluid':[0,1,2]};b['permutations']=[]
texture('fluid_tank_0','tank',0);b['components']['minecraft:material_instances']=material('fluid_tank_0')
for fluid,kind in [(1,'tank'),(2,'lava_tank')]:
 for n in range(1,9):
  name=f'fluid_tank_{fluid}_{n}';texture(name,kind,n)
  b['permutations'].append({'condition':f"q.block_state('hakkai:level') == {n} && q.block_state('hakkai:fluid') == {fluid}",'components':{'minecraft:material_instances':material(name)}})
write(bp/'blocks/fluid_tank.json',j);recipe('fluid_tank',['minecraft:glass','minecraft:glass','minecraft:copper_ingot','minecraft:iron_ingot'])
for suffix,label,ingredient in [('', '東',None),('_west','西','minecraft:redstone'),('_north','北','minecraft:flint'),('_south','南','minecraft:string'),('_up','上','minecraft:feather'),('_down','下','minecraft:gravel')]:
 name='fluid_pump'+suffix;j=basic(name,'動力ポンプ（'+label+'行き）','pump');j['minecraft:block']['components']['minecraft:tick']['interval_range']=[8,10];write(bp/f'blocks/{name}.json',j)
 recipe(name,['hakkai:fluid_pump',ingredient] if ingredient else ['hakkai:fluid_pipe','minecraft:piston','minecraft:iron_ingot'])
j=read(bp/'blocks/mixer.json');b=j['minecraft:block'];b['description']['identifier']='hakkai:fluid_basin';b['components']['minecraft:display_name']='tile.hakkai:fluid_basin.name';b['components']['minecraft:loot']='loot_tables/hakkai/blocks/fluid_basin.json';texture('fluid_basin','basin');b['components']['minecraft:material_instances']=material('fluid_basin')
for perm in b['permutations']:perm['components']['minecraft:material_instances']=material('fluid_basin')
write(bp/'blocks/fluid_basin.json',j);loot('fluid_basin');lang('fluid_basin','液体加工槽');recipe('fluid_basin',['minecraft:cauldron','hakkai:fluid_pipe','minecraft:iron_ingot'])
j=basic('fluid_loader','液体注入機','basin');j['minecraft:block']['components']['minecraft:tick']['interval_range']=[8,10];write(bp/'blocks/fluid_loader.json',j);recipe('fluid_loader',['hakkai:fluid_pipe','minecraft:hopper','minecraft:iron_ingot'])
# Axis-specific gearboxes: negative -> positive axis gives the stated ratio.
for base,label in [('gear_up','増速'),('gear_down','減速')]:
 for axis,jp,ingredient in [('z','北南','minecraft:flint'),('y','上下','minecraft:feather')]:
  name=f'{base}_{axis}';j=read(bp/f'blocks/{base}.json');b=j['minecraft:block'];b['description']['identifier']='hakkai:'+name;b['components']['minecraft:display_name']=f'tile.hakkai:{name}.name';b['components']['minecraft:loot']=f'loot_tables/hakkai/blocks/{name}.json';texture(name,'gear',1 if axis=='z' else 2);b['components']['minecraft:material_instances']=material(name);write(bp/f'blocks/{name}.json',j);loot(name);lang(name,label+'歯車箱（'+jp+'）');recipe(name,['hakkai:'+base,ingredient])
write(atlasp,atlas)
