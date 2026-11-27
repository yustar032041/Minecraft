#!/usr/bin/env python3
"""Generate eight new sword entities. Never rewrites approved existing textures.

The separate blade models/atlases and three pose tracks are dedicated to the
warden's swords; damage and motion are owned by the server script. --check is
reproducible and changes no files. Requires Pillow.
"""
import argparse,io,json,math,random
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';BP=ROOT/'BehaviorPack';RP=ROOT/'ResourcePack'
NAMES=['風裂の剣','霧縫いの剣','砂葬の剣','氷鏡の剣','雷迅の剣','深影の剣','雲翼の剣','時環の剣']
PALETTES=[((25,68,86),(43,172,183),(181,255,232)),((39,40,72),(110,100,167),(218,210,255)),((91,48,18),(192,126,54),(255,223,151)),((27,61,92),(73,165,208),(206,251,255)),((50,45,80),(114,103,204),(255,230,127)),((22,18,42),(99,52,132),(225,160,247)),((41,74,101),(117,187,215),(239,252,255)),((57,39,52),(171,124,54),(255,226,148))]
# blade width, length, guard span, blade ornament kind
SHAPES=[(3.6,27,9,'wings'),(3.2,29,8,'thorn'),(5,25,10,'steps'),(3.8,30,8,'crystal'),(3.4,30,9,'lightning'),(4.2,28,8,'fang'),(3.3,30,11,'wings'),(4.5,28,10,'clock')]
def jsonbytes(obj):return (json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode()
def cube(origin,size,tile):
 x=tile*64
 uv={side:{'uv':[x,0],'uv_size':[64,64]} for side in ('north','south','east','west','up','down')}
 return {'origin':origin,'size':size,'uv':uv}
def assets():
 files={}
 files[RP/'render_controllers/warden_sword.render_controllers.json']=jsonbytes({'format_version':'1.10.0','render_controllers':{'controller.render.hakkai.warden_sword':{'geometry':'Geometry.default','materials':[{'*':'Material.default'}],'textures':['Texture.default']}}})
 for i,((dark,mid,light),(width,length,guard,kind)) in enumerate(zip(PALETTES,SHAPES)):
  id=f'warden_sword_{i}';ident=f'hakkai:{id}'
  bp={'format_version':'1.21.90','minecraft:entity':{'description':{'identifier':ident,'is_spawnable':False,'is_summonable':True,'properties':{
   'hakkai:held':{'type':'bool','default':False,'client_sync':True},'hakkai:blade_state':{'type':'int','range':[0,2],'default':0,'client_sync':True}}},'components':{
   'minecraft:type_family':{'family':['hakkai_warden_sword']},'minecraft:collision_box':{'width':.55,'height':2.5},
   'minecraft:physics':{'has_gravity':False,'has_collision':False},'minecraft:pushable':{'is_pushable':False,'is_pushable_by_piston':False},
   'minecraft:damage_sensor':{'triggers':{'cause':'all','deals_damage':'no'}},'minecraft:persistent':{}}}}
  files[BP/f'entities/{id}.json']=jsonbytes(bp)
  parts=[cube([-1,0,-.8],[2,7,1.6],1),cube([-guard/2,7,-1.1],[guard,2,2.2],3),
         cube([-width/2,9,-.7],[width,length-3,1.4],0),cube([-width*.35,9+length-3,-.65],[width*.7,2,1.3],0),cube([-width*.2,9+length-1,-.5],[width*.4,2,1],2),
         cube([-.55,10,-.8],[1.1,length-4,.25],2),cube([-1.2,7.5,-1.4],[2.4,2.4,.5],2),cube([-.8,-1,-1],[1.6,1.4,2],3)]
  if kind=='wings':parts += [cube([-guard/2-1,8,-.8],[2,5,1.6],2),cube([guard/2-1,8,-.8],[2,5,1.6],2)]
  elif kind=='thorn':parts += [cube([-width/2-1,14,-.6],[1,6,1.2],3),cube([width/2,20,-.6],[1,6,1.2],3)]
  elif kind=='steps':parts += [cube([-width/2-1,12,-.7],[1,7,1.4],3),cube([width/2,12,-.7],[1,7,1.4],3)]
  elif kind=='crystal':parts += [cube([-width/2-1,16,-.6],[1,10,1.2],2),cube([width/2,16,-.6],[1,10,1.2],2)]
  elif kind=='lightning':parts += [cube([-width/2-1,14,-.6],[1.2,6,1.2],2),cube([width/2-.2,23,-.6],[1.2,6,1.2],2)]
  elif kind=='fang':parts += [cube([-width/2-1,13,-.5],[1,8,1],3),cube([width/2,18,-.5],[1,8,1],3)]
  elif kind=='clock':parts += [cube([-3,12,-1],[6,1,2],3),cube([-2,11,-1],[1,3,2],3),cube([1,11,-1],[1,3,2],3)]
  geo={'format_version':'1.12.0','minecraft:geometry':[{'description':{'identifier':f'geometry.hakkai.{id}','texture_width':256,'texture_height':64,'visible_bounds_width':4,'visible_bounds_height':5,'visible_bounds_offset':[0,1.1,0]},'bones':[{'name':'weapon','pivot':[0,7,0],'cubes':parts}]}]}
  files[RP/f'models/entity/{id}.geo.json']=jsonbytes(geo)
  anim={
   f'animation.hakkai.{id}.idle':{'loop':True,'animation_length':2,'bones':{'weapon':{'rotation':[0,0,'math.sin(query.life_time * 150) * 3'],'position':[0,'math.sin(query.life_time * 180) * .7',0]}}},
   f'animation.hakkai.{id}.windup':{'loop':True,'animation_length':1,'bones':{'weapon':{'rotation':[0,0,[-24,-32,-16,-26,-35,-23,-30,-20][i]]}}},
   f'animation.hakkai.{id}.strike':{'loop':True,'animation_length':.4,'bones':{'weapon':{'rotation':[0,0,[32,38,23,32,42,30,37,27][i]]}}},
   f'animation.hakkai.{id}.held':{'loop':True,'animation_length':1,'bones':{'weapon':{'scale':[0,0,0]}}}
  }
  files[RP/f'animations/{id}.animation.json']=jsonbytes({'format_version':'1.8.0','animations':anim})
  aliases={p:f'animation.hakkai.{id}.{p}' for p in ('idle','windup','strike','held')}
  client={'format_version':'1.10.0','minecraft:client_entity':{'description':{'identifier':ident,'materials':{'default':'entity_alphatest'},'textures':{'default':f'textures/entity/hakkai_{id}'},'geometry':{'default':f'geometry.hakkai.{id}'},'animations':aliases,
   'scripts':{'animate':[{'idle':"!query.property('hakkai:held') && query.property('hakkai:blade_state') == 0"},{'windup':"!query.property('hakkai:held') && query.property('hakkai:blade_state') == 1"},{'strike':"!query.property('hakkai:held') && query.property('hakkai:blade_state') == 2"},{'held':"query.property('hakkai:held')"}]},
   'render_controllers':['controller.render.hakkai.warden_sword']}}}
  files[RP/f'entity/{id}.entity.json']=jsonbytes(client)
  im=Image.new('RGBA',(256,64));d=ImageDraw.Draw(im);rng=random.Random(400+i)
  for tile in range(4):
   base=[mid,dark,light,mid][tile]
   for y in range(64):
    for x in range(64):
     v=int(12*math.sin(x/9)+7*math.sin(y/11))+rng.randint(-4,4)
     col=tuple(max(0,min(255,c+v)) for c in base)
     im.putpixel((tile*64+x,y),(*col,255))
   x0=tile*64;d.rectangle((x0+2,2,x0+61,61),outline=(*dark,255),width=2)
   d.line((x0+8,7,x0+8,57),fill=(*light,255),width=2);d.line((x0+50,7,x0+50,57),fill=(*dark,255),width=2)
  # Each blade bears its own number of engraved segments and glyph geometry.
  for n in range(i+2):
   y=8+n*5;d.line((20,y,44,y+2),fill=(*light,255),width=1)
  d.polygon([(30,16),(38,29),(30,42),(22,29)],outline=(*light,255),width=2)
  buf=io.BytesIO();im.save(buf,format='PNG');files[RP/f'textures/entity/hakkai_{id}.png']=buf.getvalue()
 return files

def main():
 p=argparse.ArgumentParser();g=p.add_mutually_exclusive_group(required=True);g.add_argument('--write',action='store_true');g.add_argument('--check',action='store_true');a=p.parse_args()
 for path,data in assets().items():
  if a.write:path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
  elif not path.exists() or path.read_bytes()!=data:raise SystemExit(f'stale: {path}')
 # Append names only; never overwrite existing translations.
 for lang in ['ja_JP','en_US']:
  path=RP/f'texts/{lang}.lang';raw=path.read_text(encoding='utf8');updated=raw
  for i,name in enumerate(NAMES):
   key=f'entity.hakkai:warden_sword_{i}.name=';line=key+(name if lang=='ja_JP' else f'Realm Blade {i+1}')
   entries=[x for x in updated.splitlines() if x.startswith(key)]
   if entries and entries!=[line]:raise ValueError(f'unexpected translation {key}')
   if not entries:updated+=('' if updated.endswith('\n') else '\n')+line+'\n'
  if a.write and updated!=raw:path.write_text(updated,encoding='utf8')
  elif a.check and updated!=raw:raise SystemExit(f'stale language {path}')
 print('8 independently modeled warden swords; no health, drops or bossbar; new textures only')
if __name__=='__main__':main()
