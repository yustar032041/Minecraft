#!/usr/bin/env python3
"""Create 32 original, themed friendly humanoids; requires Pillow."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,colorsys
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0'
bp=root/'BehaviorPack';rp=root/'ResourcePack'
themes=[('風車','668953','dbbf71','8b6741'),('霧森','456f61','c4d4a1','765445'),('砂路','bc8c58','e5d5a6','845b49'),('鏡湖','6194ae','d2eef2','77605c'),('雷炉','775d4c','df9f60','785641'),('灯苔','514f78','9fd4af','6a515e'),('雲渡り','8fb7c4','f2e6c2','8b7260'),('時結び','69577b','d4b975','755854')]
roles=['道案内','手当て係','物資係','見守り兵']
def out(path,obj):path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def box(origin,size,uv):return {'origin':origin,'size':size,'uv':{f:{'uv':uv,'uv_size':[16,16]} for f in ['north','south','west','east','up','down']}}
# All faces use deliberate texture swatches. A dedicated front head swatch
# supplies eyes; a 3D nose, four hats and aprons make recognizable silhouettes.
for i in range(4):
 head=box([-4,24,-4],[8,8,8],[0,0]);head['uv']['north']={'uv':[16,0],'uv_size':[16,16]}
 bones=[{'name':'body','pivot':[0,12,0],'cubes':[box([-4,12,-2],[8,12,4],[32,0]),box([-3,12,-2.3],[6,8,.3],[48,0])]},
 {'name':'head','parent':'body','pivot':[0,24,0],'cubes':[head,box([-1,26,-5],[2,3,1],[0,0])]},
 {'name':'arm_l','parent':'body','pivot':[5,22,0],'cubes':[box([4,12,-2],[4,10,4],[64,0])]},
 {'name':'arm_r','parent':'body','pivot':[-5,22,0],'cubes':[box([-8,12,-2],[4,10,4],[64,0])]},
 {'name':'leg_0','pivot':[2,12,0],'cubes':[box([0,0,-2],[4,12,4],[80,0])]},
 {'name':'leg_1','pivot':[-2,12,0],'cubes':[box([-4,0,-2],[4,12,4],[80,0])]}]
 hats=[ [box([-5,31,-5],[10,1,10],[96,0]),box([-4,32,-4],[8,2,8],[96,0])], [box([-4.5,31,-4.5],[9,2,9],[96,0]),box([-1,33,-1],[2,2,2],[48,0])], [box([-5,31,-5],[10,1,10],[96,0]),box([-3,32,-3],[6,3,6],[96,0])], [box([-4.5,30,-4.5],[9,3,9],[96,0]),box([-1,33,-4],[2,2,4],[48,0])] ]
 bones[1]['cubes']+=hats[i]
 geo={'format_version':'1.12.0','minecraft:geometry':[{'description':{'identifier':f'geometry.hakkai.resident_{i}','texture_width':128,'texture_height':128,'visible_bounds_width':3,'visible_bounds_height':3,'visible_bounds_offset':[0,1.1,0]},'bones':bones}]}
 out(rp/f'models/entity/resident_{i}.geo.json',geo)
lang=[]
for r,(prefix,col,accent,skin_hex) in enumerate(themes):
 for i,role in enumerate(roles):
  ident=f'resident_{r}_{i}';name=f'{prefix}の{role}'
  color='#'+col;light='#'+accent;skin='#'+skin_hex
  img=Image.new('RGBA',(128,128),(0,0,0,0));d=ImageDraw.Draw(img)
  d.rectangle((0,0,15,15),fill=skin);d.rectangle((16,0,31,15),fill=skin)
  d.rectangle((19,5,21,7),fill='#352f31');d.rectangle((26,5,28,7),fill='#352f31');d.line((20,4,22,4),fill=light);d.line((26,4,28,4),fill=light)
  d.rectangle((32,0,47,15),fill=color);d.rectangle((32,11,47,12),fill=light)
  for x in range(33,48,4):d.point((x,3+(r%3)),fill=light)
  d.rectangle((48,0,63,15),fill=light);d.rectangle((49,1,62,13),outline=color,width=1)
  # Role insignia: signpost, cross, tools, shield.
  if i==0:d.line((55,2,55,12),fill=color,width=2);d.line((51,4,60,4),fill=color,width=2)
  if i==1:d.rectangle((54,3,57,11),fill=color);d.rectangle((51,6,60,8),fill=color)
  if i==2:d.line((51,3,60,12),fill=color,width=2);d.line((60,3,51,12),fill=color,width=2)
  if i==3:d.polygon([(51,3),(60,3),(59,10),(55,13),(51,10)],fill=color);d.line((55,4,55,10),fill=light)
  d.rectangle((64,0,79,15),fill=color);d.rectangle((64,11,79,13),fill=light)
  d.rectangle((80,0,95,15),fill='#353443');d.rectangle((80,0,95,3),fill=color)
  d.rectangle((96,0,111,15),fill=color);d.rectangle((96,9,111,11),fill=light)
  img.save(rp/f'textures/entity/{ident}.png')
  family=['mob','hakkai_resident',f'hakkai_resident_{roles.index(role)}']
  c={'minecraft:type_family':{'family':family},'minecraft:health':{'value':24,'max':24},'minecraft:collision_box':{'width':0.6,'height':1.95},'minecraft:physics':{},'minecraft:movement':{'value':0.23},'minecraft:movement.basic':{},'minecraft:jump.static':{},'minecraft:navigation.walk':{'avoid_water':True,'avoid_damage_blocks':True},'minecraft:behavior.float':{'priority':0},'minecraft:behavior.random_stroll':{'priority':6,'speed_multiplier':0.65},'minecraft:behavior.look_at_player':{'priority':7,'look_distance':8,'probability':0.08},'minecraft:behavior.random_look_around':{'priority':8},'minecraft:nameable':{}}
  if i!=3:
   c['minecraft:behavior.avoid_mob_type']={'priority':2,'entity_types':[{'filters':{'test':'is_family','subject':'other','value':'monster'},'max_dist':8,'sprint_speed_multiplier':1.2}]}
  else:
   c['minecraft:attack']={'damage':4}
   c['minecraft:behavior.nearest_attackable_target']={'priority':2,'must_see':True,'entity_types':[{'filters':{'all_of':[{'test':'is_family','subject':'other','value':'monster'},{'test':'is_family','subject':'other','operator':'!=','value':'creeper'}]},'max_dist':10}]}
   c['minecraft:behavior.melee_attack']={'priority':3,'track_target':True}
  out(bp/f'entities/{ident}.json',{'format_version':'1.21.90','minecraft:entity':{'description':{'identifier':'hakkai:'+ident,'is_spawnable':True,'is_summonable':True},'components':c}})
  out(rp/f'entity/{ident}.entity.json',{'format_version':'1.10.0','minecraft:client_entity':{'description':{'identifier':'hakkai:'+ident,'materials':{'default':'entity_alphatest'},'textures':{'default':'textures/entity/'+ident},'geometry':{'default':f'geometry.hakkai.resident_{i}'},'render_controllers':['controller.render.hakkai.beast'],'animations':{'walk':'animation.hakkai.brute.stride'},'scripts':{'animate':[{'walk':'query.modified_move_speed > 0.01'}]},'spawn_egg':{'base_color':color,'overlay_color':light}}}})
  lang += [f'entity.hakkai:{ident}.name={name}',f'item.spawn_egg.entity.hakkai:{ident}.name={name}のスポーンエッグ']
# Explicit markers keep regeneration idempotent and leave other translations intact.
for locale in ['ja_JP','en_US']:
 path=rp/f'texts/{locale}.lang';s=path.read_text(encoding='utf8');start='## HAKKAI_FRIENDLY_RESIDENTS_START';end='## HAKKAI_FRIENDLY_RESIDENTS_END'
 if start in s:s=s[:s.index(start)]+s[s.index(end)+len(end):].lstrip('\n')
 lines=lang if locale=='ja_JP' else [line.replace('のスポーンエッグ',' Spawn Egg') for line in lang]
 path.write_text(s.rstrip()+'\n'+start+'\n'+'\n'.join(lines)+'\n'+end+'\n',encoding='utf8')
print('Generated 32 friendly people, 4 silhouettes and 32 themed textures')
