#!/usr/bin/env python3
"""Create a provisional small FUSHI guide and neutral chief encounter.
The geometry and UV atlas are authored for each other; art needs in-game review.
"""
from mob_experience import experience_reward
import json,random,math
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=root/'BehaviorPack';rp=root/'ResourcePack'
def write(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def uv(u,v,w,h,front=None):
 d={s:{'uv':[u,v],'uv_size':[w,h]} for s in ('north','south','east','west','up','down')}
 if front:
  for s in ('north','south'):d[s]={'uv':front[:2],'uv_size':front[2:]}
 return d
def cube(origin,size,texture):return {'origin':origin,'size':size,'uv':texture}
body=uv(0,160,192,128);face=uv(160,0,128,128,[0,0,128,128]);horn=uv(300,0,40,100);gold=uv(350,0,80,80)
bones=[{'name':'body','pivot':[0,4,0],'cubes':[cube([-6,0,-7],[12,7,14],body),cube([-5,5,-5],[10,3,10],body)]},
 {'name':'head','pivot':[0,5,-5],'cubes':[cube([-4,3,-10],[8,6,6],face),cube([-3,9,-8],[2,4,2],horn),cube([1,9,-8],[2,4,2],horn)]}]
for chief in (False,True):
 name='fushi_chief' if chief else 'fushi';b=[dict(x) for x in bones]
 if chief:b.append({'name':'crown','parent':'head','pivot':[0,12,-7],'cubes':[cube([-4,11,-9],[8,2,4],gold),cube([-4,13,-9],[2,3,4],gold),cube([-1,13,-9],[2,4,4],gold),cube([2,13,-9],[2,3,4],gold)]})
 write(rp/f'models/entity/{name}.geo.json',{'format_version':'1.12.0','minecraft:geometry':[{'description':{'identifier':f'geometry.hakkai.{name}','texture_width':512,'texture_height':512,'visible_bounds_width':4,'visible_bounds_height':3,'visible_bounds_offset':[0,1,0]},'bones':b}]})
 c={'minecraft:type_family':{'family':['mob','animal','hakkai_fushi',*(['hakkai_boss'] if chief else ['hakkai_wildlife'])]},'minecraft:health':{'value':180 if chief else 24,'max':180 if chief else 24},'minecraft:collision_box':{'width':1.4 if chief else .8,'height':1.5 if chief else .85},'minecraft:physics':{},'minecraft:movement':{'value':.16 if chief else .12},'minecraft:movement.basic':{},'minecraft:jump.static':{},'minecraft:navigation.walk':{'avoid_water':True,'avoid_damage_blocks':True},'minecraft:behavior.float':{'priority':0},'minecraft:behavior.random_stroll':{'priority':6,'speed_multiplier':.55},'minecraft:behavior.look_at_player':{'priority':7,'look_distance':9,'probability':.1},'minecraft:behavior.random_look_around':{'priority':8},'minecraft:nameable':{}}
 c['minecraft:experience_reward']=experience_reward(name)
 if not chief:c['minecraft:behavior.tempt']={'priority':3,'speed_multiplier':.8,'items':['minecraft:bamboo'],'within_radius':8,'stop_distance':2}
 if chief:c.update({'minecraft:scale':{'value':1.65},'minecraft:knockback_resistance':{'value':1.0},'minecraft:pushable':{'is_pushable':False,'is_pushable_by_piston':False},'minecraft:boss':{'name':'FUSHIのチーフ','hud_range':32,'should_darken_sky':False},'minecraft:behavior.hurt_by_target':{'priority':1},'minecraft:behavior.move_towards_target':{'priority':2,'speed_multiplier':.75,'within_radius':12}})
 wild={'minecraft:despawn':{'despawn_from_distance':{'min_distance':36,'max_distance':80}}}
 write(bp/f'entities/{name}.json',{'format_version':'1.21.90','minecraft:entity':{'description':{'identifier':f'hakkai:{name}','is_spawnable':True,'is_summonable':True},'components':c,'component_groups':{'hakkai:wild':wild},'events':{'hakkai:wild':{'add':{'component_groups':['hakkai:wild']}}}}})
 write(rp/f'entity/{name}.entity.json',{'format_version':'1.10.0','minecraft:client_entity':{'description':{'identifier':f'hakkai:{name}','materials':{'default':'entity_alphatest'},'textures':{'default':f'textures/entity/hakkai_{name}'},'geometry':{'default':f'geometry.hakkai.{name}'},'render_controllers':['controller.render.hakkai.beast'],'animations':{'idle':'animation.hakkai.fushi.idle','walk':'animation.hakkai.fushi.walk'},'scripts':{'animate':['idle',{'walk':'query.modified_move_speed > 0.01'}]},'spawn_egg':{'base_color':'#dfd6f2','overlay_color':'#e8c46b' if chief else '#b9a5de'}}}})
 rng=random.Random(548+chief);im=Image.new('RGBA',(512,512),(226,216,239,255));p=im.load()
 for y in range(288):
  for x in range(400):
   n=rng.randrange(-8,9);wave=6*math.sin(x/22)+5*math.cos(y/19)
   p[x,y]=(max(0,min(255,int(230+n+wave))),max(0,min(255,int(222+n+wave))),max(0,min(255,int(243+n+wave))),255)
 d=ImageDraw.Draw(im)
 # Soft, contrasting face and fine texture drawn in the actual head UV cell.
 d.ellipse((20,42,46,75),fill=(64,48,86,255));d.ellipse((82,42,108,75),fill=(64,48,86,255))
 for x in (28,90):d.ellipse((x,47,x+7,55),fill=(255,255,255,255))
 d.arc((53,60,76,82),10,170,fill=(127,85,128,255),width=3)
 d.ellipse((9,71,26,79),fill=(239,173,200,255));d.ellipse((102,71,119,79),fill=(239,173,200,255))
 d.ellipse((67,184,125,240),fill=(203,184,223,255),outline=(173,142,199,255),width=4)
 d.ellipse((82,190,119,229),fill=(248,230,168,255));d.ellipse((94,184,122,220),fill=(203,184,223,255))
 for _ in range(600):
  x=rng.randrange(192);y=rng.randrange(160,288);d.line((x,y,x+2,y+1),fill=(243,234,250,255),width=1)
 d.rectangle((350,0,430,80),fill=(220,175,70,255));d.line((350,18,430,18),fill=(255,231,144,255),width=5)
 if chief:
  d.arc((11,12,117,104),190,350,fill=(227,190,98,255),width=5)
 folder=rp/'textures/entity';file=f'hakkai_{name}';im.save(folder/(file+'.png'))
 Image.new('RGBA',(512,512),(128,128,255,255)).save(folder/(file+'_n.png'))
 mer=Image.new('RGBA',(512,512),(0,0,210,255));md=ImageDraw.Draw(mer);md.ellipse((84,193,116,226),fill=(0,110,180,255));mer.save(folder/(file+'_mer.png'))
 write(folder/(file+'.texture_set.json'),{'format_version':'1.16.100','minecraft:texture_set':{'color':file,'normal':file+'_n','metalness_emissive_roughness':file+'_mer'}})
write(rp/'animations/fushi.animation.json',{'format_version':'1.8.0','animations':{'animation.hakkai.fushi.idle':{'loop':True,'animation_length':2,'bones':{'head':{'rotation':[0,0,'math.sin(query.anim_time * 180) * 4']},'body':{'rotation':[0,0,'math.sin(query.anim_time * 180) * 1.5']}}},'animation.hakkai.fushi.walk':{'loop':True,'animation_length':.5,'bones':{'body':{'rotation':[0,0,'math.sin(query.anim_time * 720) * 3'],'position':[0,'math.abs(math.sin(query.anim_time * 720)) * 0.35',0]},'head':{'rotation':[0,0,'math.sin(query.anim_time * 720) * -2']}}}}})
for lang in ('ja_JP','en_US'):
 path=rp/f'texts/{lang}.lang';s=path.read_text(encoding='utf8');lines=[]
 for key,val in [('entity.hakkai:fushi.name','FUSHI' if lang=='ja_JP' else 'FUSHI'),('entity.hakkai:fushi_chief.name','FUSHIのチーフ' if lang=='ja_JP' else 'FUSHI Chief')]:
  if not any(line.startswith(key+'=') for line in s.splitlines()):lines.append(key+'='+val)
 if lines:path.write_text(s.rstrip()+'\n'+'\n'.join(lines)+'\n',encoding='utf8')
print('Generated provisional FUSHI and neutral chief entities')
