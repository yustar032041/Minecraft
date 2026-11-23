#!/usr/bin/env python3
"""Original kinetic block housings and client-animated rotating geometry."""
from pathlib import Path
import json
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=root/'BehaviorPack';rp=root/'ResourcePack'
def write(path,v):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
for name,label,parts in [('gear_up','増速歯車箱',['minecraft:iron_ingot','minecraft:copper_ingot','minecraft:redstone']),('gear_down','減速歯車箱',['minecraft:iron_ingot','minecraft:iron_ingot','minecraft:copper_ingot'])]:
 base=json.loads((bp/'blocks/shaft.json').read_text());b=base['minecraft:block'];b['description']['identifier']='hakkai:'+name;b['components']['minecraft:display_name']=f'tile.hakkai:{name}.name';b['components']['minecraft:loot']=f'loot_tables/hakkai/blocks/{name}.json';write(bp/f'blocks/{name}.json',base)
 write(bp/f'loot_tables/hakkai/blocks/{name}.json',{'pools':[{'rolls':1,'entries':[{'type':'item','name':'hakkai:'+name}]}]})
 write(bp/f'recipes/{name}.json',{'format_version':'1.21.90','minecraft:recipe_shapeless':{'description':{'identifier':'hakkai:'+name},'tags':['crafting_table'],'ingredients':[{'item':p} for p in parts],'result':{'item':'hakkai:'+name,'count':1}}})
 for lang in ['ja_JP','en_US']:
  p=rp/f'texts/{lang}.lang';s=p.read_text(encoding='utf8');line=f'tile.hakkai:{name}.name={label}';
  if line not in s:p.write_text(s.rstrip()+'\n'+line+'\n',encoding='utf8')
# Small sturdy base. The rotating parts are non-colliding client entities;
# full block collision/selection is kept for existing placed blocks.
def cube(origin,size,uv=[0,0]):return {'origin':origin,'size':size,'uv':uv}
write(rp/'models/blocks/kinetic_base.geo.json',{'format_version':'1.12.0','minecraft:geometry':[{'description':{'identifier':'geometry.hakkai.kinetic_base','texture_width':32,'texture_height':32},'bones':[{'name':'base','pivot':[0,0,0],'cubes':[cube([-8,0,-8],[16,2,16])]}]}]})
for name in ['shaft','wind_rotor','water_wheel','gear_up','gear_down']:
 p=bp/f'blocks/{name}.json';j=json.loads(p.read_text());b=j['minecraft:block'];b['components']['minecraft:geometry']='geometry.hakkai.kinetic_base';b['components']['minecraft:tick']={'interval_range':[12,16],'looping':True}
 # Remove old texture-permutation animations, keeping the state to migrate
 # placed v7.1.5 blocks without deleting their block state.
 b.pop('permutations',None);write(p,j)
for name in ['mill','miner','kiln','crusher','washer','press','saw','compressor','sorter']:
 p=bp/f'blocks/{name}.json';j=json.loads(p.read_text());j['minecraft:block']['components']['minecraft:tick']={'interval_range':[8,10],'looping':True};write(p,j)
entity={'format_version':'1.21.90','minecraft:entity':{'description':{'identifier':'hakkai:kinetic_visual','is_spawnable':False,'is_summonable':True,'properties':{'hakkai:rpm':{'type':'int','range':[-128,128],'default':0,'client_sync':True},'hakkai:kind':{'type':'int','range':[0,3],'default':0,'client_sync':True}}},'components':{'minecraft:type_family':{'family':['hakkai_kinetic_visual']},'minecraft:collision_box':{'width':0.01,'height':0.01},'minecraft:physics':{'has_gravity':False,'has_collision':False},'minecraft:pushable':{'is_pushable':False,'is_pushable_by_piston':False},'minecraft:damage_sensor':{'triggers':{'cause':'all','deals_damage':'no'}}}}}
write(bp/'entities/kinetic_visual.json',entity)
client={'format_version':'1.10.0','minecraft:client_entity':{'description':{'identifier':'hakkai:kinetic_visual','materials':{'default':'entity_alphatest'},'textures':{'default':'textures/entity/hakkai_kinetic'},'geometry':{'default':'geometry.hakkai.kinetic_visual'},'animations':{'rotate':'animation.hakkai.kinetic.rotate'},'scripts':{'animate':['rotate']},'render_controllers':['controller.render.hakkai.kinetic']}}}
write(rp/'entity/kinetic_visual.entity.json',client)
bones=[{'name':'shaft','pivot':[0,8,0],'cubes':[cube([-8,6,-2],[16,4,4],[0,0])]},
 {'name':'wind','pivot':[0,8,0],'cubes':[cube([-2,6,-2],[4,4,4],[0,0]),cube([-1,9,-2],[2,5,4],[0,16]),cube([-1,2,-2],[2,5,4],[0,16]),cube([-1,6,2],[2,4,5],[0,16]),cube([-1,6,-7],[2,4,5],[0,16])]},
 {'name':'water','pivot':[0,8,0],'cubes':[cube([-2,5,-3],[4,6,6],[0,0]),cube([-1,11,-5],[2,3,10],[32,0]),cube([-1,2,-5],[2,3,10],[32,0]),cube([-1,4,5],[2,8,2],[32,0]),cube([-1,4,-7],[2,8,2],[32,0])]},
 {'name':'gear','pivot':[0,8,0],'cubes':[cube([-3,4,-4],[6,8,8],[0,32]),cube([-2,12,-2],[4,3,4],[0,32]),cube([-2,1,-2],[4,3,4],[0,32]),cube([-2,6,4],[4,4,3],[0,32]),cube([-2,6,-7],[4,4,3],[0,32])]}]
write(rp/'models/entity/kinetic_visual.geo.json',{'format_version':'1.12.0','minecraft:geometry':[{'description':{'identifier':'geometry.hakkai.kinetic_visual','texture_width':64,'texture_height':64,'visible_bounds_width':3,'visible_bounds_height':3,'visible_bounds_offset':[0,.5,0]},'bones':bones}]})
rotation=["math.mod(query.life_time * query.property('hakkai:rpm') * 6, 360)",0,0]
write(rp/'animations/kinetic.animation.json',{'format_version':'1.8.0','animations':{'animation.hakkai.kinetic.rotate':{'loop':True,'bones':{b['name']:{'rotation':rotation} for b in bones}}}})
write(rp/'render_controllers/kinetic.render_controllers.json',{'format_version':'1.8.0','render_controllers':{'controller.render.hakkai.kinetic':{'geometry':'Geometry.default','materials':[{'*':'Material.default'}],'textures':['Texture.default'],'part_visibility':[{'*':1},{'wind':"query.property('hakkai:kind') == 1"},{'water':"query.property('hakkai:kind') == 2"},{'gear':"query.property('hakkai:kind') == 3"}]}}})
im=Image.new('RGBA',(64,64),'#98693b');d=ImageDraw.Draw(im)
for y in range(64):
 for x in range(64):
  if y<16:c=(118+(x*7+y*3)%23,90+(x*5+y*3)%20,57+(x+y)%15,255)
  elif y<32:c=(222+(x*3+y)%22,209+(x+y*2)%24,174+(x+y)%17,255)
  elif x<32:c=(192+(x+y)%38,139+(x*3+y)%35,65+(x+y*2)%25,255)
  else:c=(58+(x+y)%20,122+(x*2+y)%31,145+(x+y*3)%32,255)
  im.putpixel((x,y),c)
im.save(rp/'textures/entity/hakkai_kinetic.png',optimize=True)

import runpy
runpy.run_path(str(Path(__file__).with_name('build_factory_lines_assets.py')),run_name='__main__')
