#!/usr/bin/env python3
"""Generate the eight realm traveller entities and their UV-mapped textures.

Provisional procedural art: not a substitute for authored creature artwork or
an in-game render test. Existing vanilla entities and textures are untouched.
"""
import json, math, random
from pathlib import Path
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0'
bp=root/'BehaviorPack';rp=root/'ResourcePack'
colors=[(142,219,151),(141,210,176),(246,165,85),(154,222,250),(238,184,78),(176,115,228),(184,211,255),(236,150,213)]
names=['風','霧','砂','氷','雷','闇','空','時']
english=['Wind','Mist','Sand','Frost','Thunder','Abyss','Sky','Time']
def write(path,data):
 path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

def faces(u,v,w,h,front=None):
 f={name:{'uv':[u,v],'uv_size':[w,h]} for name in ('north','south','east','west','up','down')}
 if front:
  for name in ('north','south'):f[name]={'uv':list(front[:2]),'uv_size':list(front[2:])}
 return f

def cube(origin,size,uv):return {'origin':origin,'size':size,'uv':uv}
head=faces(128,0,128,128,(0,0,128,128)); body=faces(0,128,128,160)
arm=faces(128,128,64,160);leg=faces(192,128,64,160)
bones=[{'name':'body','pivot':[0,20,0],'cubes':[cube([-4,20,-2],[8,16,4],body)]},
 {'name':'head','pivot':[0,36,0],'cubes':[cube([-4,36,-4],[8,8,8],head)]},
 {'name':'right_arm','pivot':[-5,34,0],'cubes':[cube([-6,8,-1],[2,26,2],arm)]},
 {'name':'left_arm','pivot':[5,34,0],'cubes':[cube([4,8,-1],[2,26,2],arm)]},
 {'name':'right_leg','pivot':[-2,20,0],'cubes':[cube([-4,0,-2],[3,20,4],leg)]},
 {'name':'left_leg','pivot':[2,20,0],'cubes':[cube([1,0,-2],[3,20,4],leg)]}]
write(rp/'models/entity/realm_ender.geo.json',{'format_version':'1.12.0','minecraft:geometry':[{'description':{'identifier':'geometry.hakkai.realm_ender','texture_width':512,'texture_height':512,'visible_bounds_width':3,'visible_bounds_height':4,'visible_bounds_offset':[0,1.4,0]},'bones':bones}]})
write(rp/'animations/realm_ender.animation.json',{'format_version':'1.8.0','animations':{'animation.hakkai.realm_ender.walk':{'loop':True,'animation_length':1,'bones':{'right_leg':{'rotation':['math.sin(query.anim_time * 360) * 24',0,0]},'left_leg':{'rotation':['math.sin(query.anim_time * 360 + 180) * 24',0,0]},'right_arm':{'rotation':['math.sin(query.anim_time * 360 + 180) * 16',0,0]},'left_arm':{'rotation':['math.sin(query.anim_time * 360) * 16',0,0]}}}}})
for r,color in enumerate(colors):
 ident=f'ender_{r}'
 c={'minecraft:type_family':{'family':['mob','hakkai_realm_ender']},'minecraft:health':{'value':48+r*3,'max':48+r*3},'minecraft:collision_box':{'width':.65,'height':2.75},'minecraft:physics':{},'minecraft:movement':{'value':.20+r*.004},'minecraft:movement.basic':{},'minecraft:jump.static':{},'minecraft:navigation.walk':{'avoid_water':True,'avoid_damage_blocks':True},'minecraft:knockback_resistance':{'value':.5},'minecraft:loot':{'table':f'loot_tables/hakkai/entities/{ident}.json'},'minecraft:behavior.float':{'priority':0},'minecraft:behavior.hurt_by_target':{'priority':1},'minecraft:behavior.move_towards_target':{'priority':2,'speed_multiplier':1.0,'within_radius':16},'minecraft:behavior.random_stroll':{'priority':6,'speed_multiplier':.8},'minecraft:behavior.look_at_player':{'priority':7,'look_distance':12,'probability':.1},'minecraft:behavior.random_look_around':{'priority':8},'minecraft:nameable':{}}
 write(bp/f'entities/{ident}.json',{'format_version':'1.21.90','minecraft:entity':{'description':{'identifier':'hakkai:'+ident,'is_spawnable':True,'is_summonable':True},'components':c,'component_groups':{'hakkai:wild':{'minecraft:despawn':{'despawn_from_distance':{'min_distance':36,'max_distance':80}}}},'events':{'hakkai:wild':{'add':{'component_groups':['hakkai:wild']}}}}})
 write(bp/f'loot_tables/hakkai/entities/{ident}.json',{'pools':[{'rolls':1,'entries':[{'type':'item','name':f'hakkai:pearl_{r}'}]}]})
 write(bp/f'items/pearl_{r}.json',{'format_version':'1.26.0','minecraft:item':{'description':{'identifier':f'hakkai:pearl_{r}','menu_category':{'category':'items'}},'components':{'minecraft:display_name':{'value':f'item.hakkai:pearl_{r}.name'},'minecraft:icon':f'hakkai_pearl_{r}','minecraft:max_stack_size':16,'minecraft:glint':True,'hakkai:use':{},'minecraft:interact_button':'action.interact.hakkai.use'}}})
 write(rp/f'entity/{ident}.entity.json',{'format_version':'1.10.0','minecraft:client_entity':{'description':{'identifier':'hakkai:'+ident,'materials':{'default':'entity_alphatest'},'textures':{'default':f'textures/entity/hakkai_ender_r{r}'},'geometry':{'default':'geometry.hakkai.realm_ender'},'render_controllers':['controller.render.hakkai.beast'],'animations':{'walk':'animation.hakkai.realm_ender.walk'},'scripts':{'animate':[{'walk':'query.modified_move_speed > 0.01'}]},'spawn_egg':{'base_color':'#181526','overlay_color':'#%02x%02x%02x'%color}}}})
 # Coherent shaded cloth/stone with colored constellations; atlas cells correspond
 # exactly to the per-face UV rectangles in realm_ender.geo.json above.
 rng=random.Random(892+r); im=Image.new('RGBA',(512,512),(20,17,29,255));p=im.load()
 for y in range(288):
  for x in range(256):
   n=rng.randrange(-7,8);wave=4*math.sin(x*.08)+3*math.sin(y*.10)
   p[x,y]=(max(0,int(30+n+wave+color[0]*.045)),max(0,int(25+n+wave+color[1]*.035)),max(0,int(39+n+wave+color[2]*.045)),255)
 d=ImageDraw.Draw(im); bright=(*color,255);dim=(*(int(v*.52) for v in color),255)
 # Eye slits on north/south faces, angular frame and vertical glowing pupils.
 d.line([(10,31),(27,20),(101,20),(118,31)],fill=dim,width=3)
 for x in (23,76):
  d.polygon([(x,45),(x+29,42),(x+29,55),(x,58)],fill=bright)
  d.rectangle((x+11,44,x+15,56),fill=(250,250,242,255))
 d.line([(16,88),(32,96),(96,96),(112,88)],fill=dim,width=3)
 # Chest and limb-specific markings; every realm has its own shaped crest.
 d.line([(10,145),(28,155),(64,146),(100,155),(118,145)],fill=dim,width=4)
 d.polygon([(64,166),(86,191),(64,216),(42,191)],outline=bright,width=4)
 for k in range(r+1):
  a=math.tau*k/(r+1);x=int(64+13*math.cos(a));y=int(191+13*math.sin(a));d.ellipse((x-2,y-2,x+2,y+2),fill=bright)
 for x in (143,207):
  d.line([(x,153),(x+7,181),(x,210),(x+8,242),(x,272)],fill=dim,width=3)
 for _ in range(180):
  x=rng.randrange(256);y=rng.randrange(288)
  if rng.random()<.18:d.point((x,y),fill=dim)
 folder=rp/'textures/entity';name=f'hakkai_ender_r{r}';im.save(folder/(name+'.png'))
 # Neutral normal and approximate emissive accents; PBR appearance needs review.
 Image.new('RGBA',(512,512),(128,128,255,255)).save(folder/(name+'_n.png'))
 mer=Image.new('RGBA',(512,512),(0,0,210,255));md=ImageDraw.Draw(mer)
 for x in (23,76):md.polygon([(x,45),(x+29,42),(x+29,55),(x,58)],fill=(0,220,180,255))
 md.line([(64,166),(86,191),(64,216),(42,191),(64,166)],fill=(0,150,200,255),width=4)
 mer.save(folder/(name+'_mer.png'))
 write(folder/(name+'.texture_set.json'),{'format_version':'1.16.100','minecraft:texture_set':{'color':name,'normal':name+'_n','metalness_emissive_roughness':name+'_mer'}})
for lang in ('ja_JP','en_US'):
 path=rp/f'texts/{lang}.lang';s=path.read_text(encoding='utf8');lines=[]
 for i in range(8):
  for key,value in [(f'entity.hakkai:ender_{i}.name',f'{names[i]}渡りのエンダーマン' if lang=='ja_JP' else f'{english[i]} Realm Enderman'),(f'item.hakkai:pearl_{i}.name',f'{names[i]}渡りのパール' if lang=='ja_JP' else f'{english[i]} Realm Pearl')]:
   if not any(line.startswith(key+'=') for line in s.splitlines()):lines.append(key+'='+value)
 if lines:path.write_text(s.rstrip()+'\n'+'\n'.join(lines)+'\n',encoding='utf8')
print('Generated 8 realm endermen, their geometry, provisional PBR textures, pearls and loot')
