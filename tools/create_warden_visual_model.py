#!/usr/bin/env python3
"""Create the five humanoid warden skins, geometry, wings and synced client states.

The 512px atlases are original procedural pixel art, not ripped Minecraft art.
Runs after the encounter generator; safe to re-run without overwriting combat.
"""
import json, math, random
from pathlib import Path
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';rp=root/'ResourcePack';bp=root/'BehaviorPack'
def write(path,obj):
 path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def load(path):return json.loads(path.read_text(encoding='utf8'))
# Main body is 34 units (2.125 blocks), crown reaches 37 (2.3125 blocks).
def uv(front,side=None):
 side=side or front
 return {face:{'uv':list(front if face=='north' else side),'uv_size':[128,128]} for face in ('north','south','east','west','up','down')}
def cube(origin,size,front,side=None):return {'origin':origin,'size':size,'uv':uv(front,side)}
bones=[
 {'name':'body','pivot':[0,12,0],'cubes':[cube([-4,12,-2],[8,14,4],(0,128),(128,128))]},
 {'name':'head','pivot':[0,26,0],'cubes':[cube([-4,26,-4],[8,8,8],(0,0),(128,0))]},
 {'name':'right_arm','pivot':[-4,25,0],'cubes':[cube([-8,11,-2],[4,14,4],(0,256))]},
 {'name':'left_arm','pivot':[4,25,0],'cubes':[cube([4,11,-2],[4,14,4],(0,256))]},
 {'name':'right_leg','pivot':[-2,12,0],'cubes':[cube([-4,0,-2],[4,12,4],(128,256))]},
 {'name':'left_leg','pivot':[2,12,0],'cubes':[cube([0,0,-2],[4,12,4],(128,256))]},
 {'name':'crown','pivot':[0,34,0],'cubes':[cube([-4.5,33.5,-4.5],[9,1,9],(256,0)),cube([-4.5,34.5,-4.5],[1.5,2.5,1.5],(256,0)),cube([3,34.5,-4.5],[1.5,2.5,1.5],(256,0)),cube([-1,34.5,-4.5],[2,2.5,1],(256,0))]},
 # Five independent adornments make the silhouette change, not just the colour.
 {'name':'form_time','pivot':[0,25,2],'cubes':[cube([-6,17,2.5],[1,11,1],(256,256)),cube([5,17,2.5],[1,11,1],(256,256)),cube([-5,27,2.5],[10,1,1],(256,256)),cube([-5,16,2.5],[10,1,1],(256,256)),cube([-1,19,2.5],[2,6,1],(256,256)),cube([0,21,2.4],[4,1,1],(256,256))]},
 {'name':'form_sky','pivot':[0,24,1],'cubes':[cube([-9,23,-2],[3,2,5],(256,256)),cube([6,23,-2],[3,2,5],(256,256)),cube([-8,21,2],[2,4,1],(256,256)),cube([6,21,2],[2,4,1],(256,256)),cube([-3,12,2.6],[6,10,0.7],(256,256))]},
 {'name':'form_earth','pivot':[0,24,0],'cubes':[cube([-9,22,-3],[4,3,6],(256,256)),cube([5,22,-3],[4,3,6],(256,256)),cube([-3,11,-2.5],[6,2,1],(256,256)),cube([-10,20,-2],[2,3,4],(256,256)),cube([8,20,-2],[2,3,4],(256,256))]},
 {'name':'form_thunder','pivot':[0,24,0],'cubes':[cube([-8,24,-1],[2,5,2],(256,256)),cube([6,24,-1],[2,5,2],(256,256)),cube([-9,28,-1],[3,1,2],(256,256)),cube([6,28,-1],[3,1,2],(256,256)),cube([-8,18,2.5],[2,5,1],(256,256)),cube([6,16,2.5],[2,7,1],(256,256))]},
 {'name':'form_true','pivot':[0,27,2],'cubes':[cube([-6,26,3],[1,9,1],(256,256)),cube([5,26,3],[1,9,1],(256,256)),cube([-5,34,3],[10,1,1],(256,256)),cube([-1,35,3],[2,3,1],(256,256)),cube([-9,23,-2],[3,2,5],(256,256)),cube([6,23,-2],[3,2,5],(256,256))]},
 # The final form carries an orbiting halo and an extra tier of wings.
 {'name':'halo_true','pivot':[0,29,0],'cubes':[cube([-8,28,4],[16,1,1],(256,256)),cube([-8,28,-5],[16,1,1],(256,256)),cube([-8,28,-4],[1,1,8],(256,256)),cube([7,28,-4],[1,1,8],(256,256))]},
 {'name':'wing_true_left','pivot':[3,24,3],'cubes':[cube([5,25,3],[10,2,1],(256,128)),cube([8,27,3.1],[10,2,1],(256,128)),cube([11,29,3.2],[7,2,1],(256,128))]},
 {'name':'wing_true_right','pivot':[-3,24,3],'cubes':[cube([-15,25,3],[10,2,1],(256,128)),cube([-18,27,3.1],[10,2,1],(256,128)),cube([-18,29,3.2],[7,2,1],(256,128))]},
 # Four overlapping feather blades per wing, hinged separately to flap.
 {'name':'wing_left','pivot':[3,23,2],'cubes':[cube([3,21,2],[9,3,1],(256,128)),cube([6,18,2.1],[9,3,1],(256,128)),cube([8,15,2.2],[8,3,1],(256,128)),cube([10,12,2.3],[6,3,1],(256,128))]},
 {'name':'wing_right','pivot':[-3,23,2],'cubes':[cube([-12,21,2],[9,3,1],(256,128)),cube([-15,18,2.1],[9,3,1],(256,128)),cube([-16,15,2.2],[8,3,1],(256,128)),cube([-16,12,2.3],[6,3,1],(256,128))]}
]
geo={'format_version':'1.12.0','minecraft:geometry':[{'description':{'identifier':'geometry.hakkai.time_warden','texture_width':512,'texture_height':512,'visible_bounds_width':5,'visible_bounds_height':4,'visible_bounds_offset':[0,1.2,0]},'bones':bones}]}
write(rp/'models/entity/time_warden.geo.json',geo)
# Five distinct colours, with subtle deterministic grain and geometric detailing.
palettes=[((18,38,66),(46,140,199),(139,236,255)),((57,22,37),(191,54,67),(255,195,144)),((26,49,37),(70,141,76),(191,228,135)),((39,25,62),(125,62,183),(218,174,255)),((42,31,57),(191,148,49),(255,232,137))]
for phase,(dark,mid,light) in enumerate(palettes):
 rng=random.Random(4123+phase); atlas=Image.new('RGBA',(512,512),(0,0,0,0));
 def tile(x,y,style):
  im=Image.new('RGBA',(64,64),(*dark,255));dr=ImageDraw.Draw(im)
  # Tiny worn pixels give a textured, crafted rather than flat look.
  for _ in range(190):
   px,py=rng.randrange(64),rng.randrange(64);v=rng.randrange(-8,15);dr.point((px,py),fill=tuple(max(0,min(255,c+v)) for c in dark)+(255,))
  dr.rectangle((2,2,61,61),outline=(*mid,255),width=2);dr.rectangle((5,5,58,58),outline=(*light,255),width=1)
  if style=='head':
   dr.polygon([(9,7),(55,7),(58,38),(49,55),(15,55),(6,38)],fill=(*mid,255));dr.polygon([(13,10),(51,10),(53,39),(43,51),(21,51),(11,39)],fill=(*dark,255));
   dr.rectangle((11,24,53,35),fill=(8,12,25,255));dr.polygon([(15,27),(28,28),(26,32),(16,31)],fill=(*light,255));dr.polygon([(36,28),(49,27),(48,31),(38,32)],fill=(*light,255));dr.line((21,43,43,43),fill=(*mid,255),width=2)
  elif style=='body':
   dr.polygon([(8,6),(56,6),(53,40),(43,58),(21,58),(11,40)],fill=(*mid,255));dr.polygon([(12,12),(52,12),(48,38),(32,54),(16,38)],fill=(*dark,255));dr.line([(12,15),(32,32),(52,15)],fill=(*light,255),width=3);dr.polygon([(32,22),(40,31),(32,40),(24,31)],fill=(*light,255));dr.polygon([(32,26),(36,31),(32,36),(28,31)],fill=(*mid,255));dr.line((13,52,51,52),fill=(*light,255),width=2)
   # Different emblems make the five forms recognisable even in silhouette.
   if phase==0:
    dr.ellipse((22,21,42,41),outline=(*light,255),width=2);dr.line((32,23,32,31,38,33),fill=(*light,255),width=2)
   elif phase==1:dr.polygon([(22,35),(32,20),(42,35),(32,30)],fill=(*light,255))
   elif phase==2:dr.line([(22,32),(27,24),(37,24),(42,32),(37,39),(27,39),(22,32)],fill=(*light,255),width=3)
   elif phase==3:dr.polygon([(34,20),(25,33),(31,33),(28,42),(41,28),(34,28)],fill=(*light,255))
   else:
    dr.ellipse((23,22,41,40),fill=(*light,255));dr.ellipse((29,20,43,35),fill=(*dark,255));dr.line((40,21,40,27),fill=(*light,255),width=2);dr.line((37,24,43,24),fill=(*light,255),width=2)
  elif style=='limb':
   dr.rectangle((10,10,53,54),fill=(*mid,255));dr.rectangle((14,14,49,49),fill=(*dark,255));dr.line([(13,20),(32,26),(50,20)],fill=(*light,255),width=2);dr.rectangle((10,45,53,53),fill=(*mid,255));dr.line((12,48,51,48),fill=(*light,255),width=2)
  elif style=='crown':
   dr.rectangle((7,8,57,56),fill=(*mid,255));dr.rectangle((11,12,53,52),outline=(*light,255),width=3);dr.polygon([(32,16),(43,32),(32,48),(21,32)],fill=(*light,255))
  elif style=='wing':
   dr.rectangle((6,6,57,57),fill=(*mid,255));
   for q in range(-40,70,12):dr.line((q,59,q+42,7),fill=(*light,255),width=3)
   dr.line((8,55,55,8),fill=(*dark,255),width=3)
  elif style=='adorn':
   dr.rectangle((7,7,56,56),fill=(*mid,255));dr.polygon([(32,9),(55,32),(32,55),(9,32)],outline=(*light,255),width=3);dr.line((32,14,32,50),fill=(*light,255),width=2);dr.line((14,32,50,32),fill=(*light,255),width=2)
  else:
   dr.rectangle((10,10,53,53),fill=(*mid,255));dr.rectangle((14,14,49,49),fill=(*dark,255));dr.line((15,32,48,32),fill=(*light,255),width=2)
  atlas.paste(im.resize((128,128),Image.Resampling.NEAREST),(x,y))
 for x,y,style in [(0,0,'head'),(128,0,'back'),(0,128,'body'),(128,128,'back'),(0,256,'limb'),(128,256,'limb'),(256,0,'crown'),(256,128,'wing'),(256,256,'adorn')]:tile(x,y,style)
 if phase==4:
  d=ImageDraw.Draw(atlas)
  rainbow=[(95,210,255,255),(160,126,255,255),(245,125,207,255),(255,202,105,255),(145,225,151,255)]
  for i,c in enumerate(rainbow):
   d.line((10+i*5,239,100+i*5,239),fill=c,width=3)
   d.line((264+i*8,238,320+i*8,136),fill=c,width=4)
 name=f'hakkai_time_warden_form{phase}';atlas.save(rp/f'textures/entity/{name}.png')
 normal=Image.new('RGBA',(512,512),(128,128,255,255));normal.save(rp/f'textures/entity/{name}_n.png')
 # Emissive tracks the actual bright trim and eyes instead of random squares.
 luminance=atlas.convert('RGB').convert('L')
 emissive=luminance.point(lambda v: 160 if v>160 else 75 if v>110 else 0)
 mer=Image.merge('RGBA',(Image.new('L',atlas.size,0),emissive,Image.new('L',atlas.size,160),Image.new('L',atlas.size,255)))
 mer.save(rp/f'textures/entity/{name}_mer.png')
 write(rp/f'textures/entity/{name}.texture_set.json',{'format_version':'1.16.100','minecraft:texture_set':{'color':name,'normal':name+'_n','metalness_emissive_roughness':name+'_mer'}})
entity_path=bp/'entities/time_warden.json';entity=load(entity_path);desc=entity['minecraft:entity']['description'];desc['properties']={'hakkai:form':{'type':'int','range':[0,4],'default':0,'client_sync':True},'hakkai:flying':{'type':'bool','default':False,'client_sync':True}}
entity['minecraft:entity']['components']['minecraft:collision_box']={'width':.9,'height':2.35}
entity['minecraft:entity']['components']['minecraft:damage_sensor']={'triggers':{'cause':'fall','deals_damage':'no'}}
write(entity_path,entity)
client_path=rp/'entity/time_warden.entity.json';client=load(client_path);c=client['minecraft:client_entity']['description'];c['textures']={f'form{i}':f'textures/entity/hakkai_time_warden_form{i}' for i in range(5)};c['render_controllers']=['controller.render.hakkai.warden'];c['animations'].update({'wing_flight':'animation.hakkai.warden_wing_flight','hover':'animation.hakkai.warden_hover','idle':'animation.hakkai.warden_idle','halo':'animation.hakkai.warden_halo'});c['scripts']['animate']=[{'walk':"query.modified_move_speed > 0.01 && !query.property('hakkai:flying')"},{'idle':"!query.property('hakkai:flying')"},{'wing_flight':"query.property('hakkai:flying')"},{'hover':"query.property('hakkai:flying')"},{'halo':"query.property('hakkai:form') == 4"}];write(client_path,client)
render={'format_version':'1.8.0','render_controllers':{'controller.render.hakkai.warden':{'arrays':{'textures':{'Array.forms':[f'Texture.form{i}' for i in range(5)]}},'geometry':'Geometry.default','materials':[{'*':'Material.default'}],'textures':["Array.forms[query.property('hakkai:form')]"],'part_visibility':[{'*':1},*({f'form_{n}':f"query.property('hakkai:form') == {i}"} for i,n in enumerate(('time','sky','earth','thunder','true'))),{'wing_left':"query.property('hakkai:flying')"},{'wing_right':"query.property('hakkai:flying')"},{'wing_true_left':"query.property('hakkai:flying') && query.property('hakkai:form') == 4"},{'wing_true_right':"query.property('hakkai:flying') && query.property('hakkai:form') == 4"},{'halo_true':"query.property('hakkai:form') == 4"}]}}}
write(rp/'render_controllers/time_warden.render_controllers.json',render)
an_path=rp/'animations/time_warden.animation.json';an=load(an_path)
an['animations']['animation.hakkai.warden_wing_flight']={'loop':True,'animation_length':1,'bones':{'wing_left':{'rotation':[0,'15 + math.sin(query.life_time * 360) * 25',0]},'wing_right':{'rotation':[0,'-15 - math.sin(query.life_time * 360) * 25',0]},'wing_true_left':{'rotation':[0,'-10 + math.sin(query.life_time * 360 + 50) * 20',-8]},'wing_true_right':{'rotation':[0,'10 - math.sin(query.life_time * 360 + 50) * 20',8]}}}
an['animations']['animation.hakkai.warden_hover']={'loop':True,'animation_length':1,'bones':{'right_leg':{'rotation':['8 + math.sin(query.life_time * 180) * 4',0,3]},'left_leg':{'rotation':['-8 - math.sin(query.life_time * 180) * 4',0,-3]},'body':{'rotation':[2,0,0]}}}
an['animations']['animation.hakkai.warden_idle']={'loop':True,'animation_length':2,'bones':{'head':{'rotation':['math.sin(query.life_time * 90) * 2',0,0]}}}
an['animations']['animation.hakkai.warden_halo']={'loop':True,'animation_length':2,'bones':{'halo_true':{'rotation':[0,'query.life_time * 45',0]}}}
write(an_path,an)
print('Created humanoid 5-form warden, flight-only animated wings and synced rendering')
