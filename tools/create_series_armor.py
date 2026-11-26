#!/usr/bin/env python3
"""Add 11 wearable leggings and actual raised armor geometry (Pillow required).
Original armor geometry coordinates are based on the vanilla player armor UV
layout; extra plates are new small cubes on the existing player bones.
"""
import json,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter,ImageOps
from import_item_art import save_with_maps
from render_gear_icons import catalog
from render_extra_item_icons import recolor
ROOT=Path(__file__).resolve().parents[1];BP=ROOT/'Hakkai_v7.1.0/BehaviorPack';RP=ROOT/'Hakkai_v7.1.0/ResourcePack';EQ=RP/'textures/hakkai/equipment'
NAMES=['霧銀装 I','深影装 I','紅蓮装 I','大地装 I','雷光装 I','霧銀装 II','深影装 II','紅蓮装 II','大地装 II','雷光装 II','霧銀装 III']
def write(path,obj):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def itemid(i):return f'series_leggings_{i:02}'
def make_geometry(part):
 def cube(origin,size,uv,inflate=0):
  return {'origin':origin,'size':size,'uv':uv,**({'inflate':inflate} if inflate else {})}
 bones=[{'name':'waist','pivot':[0,12,0]}, {'name':'body','parent':'waist','pivot':[0,24,0]}, {'name':'head','parent':'body','pivot':[0,24,0]}, {'name':'rightArm','parent':'body','pivot':[-5,22,0]}, {'name':'leftArm','parent':'body','pivot':[5,22,0],'mirror':True}, {'name':'rightLeg','parent':'body','pivot':[-1.9,12,0]}, {'name':'leftLeg','parent':'body','pivot':[1.9,12,0],'mirror':True}]
 b={v['name']:v for v in bones}
 if part=='helmet':
  b['head']['cubes']=[cube([-4,24,-4],[8,8,8],[0,0],1),cube([-3,29,-6],[6,2,1],[8,8]),cube([-5.7,25,-1],[1,5,2],[0,0]),cube([4.7,25,-1],[1,5,2],[0,0])]
 if part=='chest':
  b['body']['cubes']=[cube([-4,12,-2],[8,12,4],[16,16],1),cube([-2.5,16,-4],[5,5,1],[20,19]),cube([-3,12,-3.8],[6,2,1],[20,19])]
  for name,x in [('rightArm',-8),('leftArm',4)]:b[name]['cubes']=[cube([x,12,-2],[4,12,4],[40,16],1),cube([x-.5,20,-4],[5,3,8],[36,16])]
 if part=='leggings':
  b['body']['cubes']=[cube([-4,12,-2],[8,4,4],[16,16],.5)]
  for name,x in [('rightLeg',-3.9),('leftLeg',-.1)]:b[name]['cubes']=[cube([x,0,-2],[4,12,4],[0,16],.49),cube([x+.5,6.5,-3.5],[3,3,1],[4,20])]
 if part=='boots':
  for name,x in [('rightLeg',-3.9),('leftLeg',-.1)]:b[name]['cubes']=[cube([x,0,-2],[4,5,4],[0,16],1),cube([x-.5,-.4,-4],[5,2,2],[4,20])]
 return {'description':{'identifier':'geometry.hakkai.armor_'+part,'texture_width':64,'texture_height':32,'visible_bounds_width':3,'visible_bounds_height':3,'visible_bounds_offset':[0,1,0]},'bones':bones}
def normals(im):
 # Bounded height-gradient approximation; no fabricated claim of real PBR.
 a=im.getchannel('A');l=im.convert('RGB').convert('L').filter(ImageFilter.GaussianBlur(.5));w,h=im.size;p=l.load();alpha=a.load();out=Image.new('RGBA',(w,h));q=out.load()
 for y in range(h):
  for x in range(w):
   dx=(p[min(w-1,x+1),y]-p[max(0,x-1),y])/255*1.5;dy=(p[x,min(h-1,y+1)]-p[x,max(0,y-1)])/255*1.5;scale=1/math.sqrt(dx*dx+dy*dy+1)
   q[x,y]=(round(127.5*(1-dx*scale)),round(127.5*(1-dy*scale)),round(127.5*(1+scale)),alpha[x,y])
 return out

def update_attach(name,part):
 path=RP/'attachables'/(name+'.json');a=json.loads(path.read_text());a['minecraft:attachable']['description']['geometry']['default']='geometry.hakkai.armor_'+part;write(path,a)
def main():
 write(RP/'models/entity/hakkai_armor_relief.geo.json',{'format_version':'1.16.0','minecraft:geometry':[make_geometry(p) for p in ['helmet','chest','leggings','boots']]})
 atlas_path=RP/'textures/item_texture.json';atlas=json.loads(atlas_path.read_text());prog_path=ROOT/'texture_progress.json';progress=json.loads(prog_path.read_text());gears={g['id']:g for g in catalog()}
 texts={lang:(RP/'texts'/(lang+'.lang')).read_text(encoding='utf8').splitlines() for lang in ('ja_JP','en_US')}
 for i,title in enumerate(NAMES):
  chest,head,boot=f'gear_{10+16*i:03}',f'gear_{11+16*i:03}',f'gear_{12+16*i:03}';name=itemid(i);g=gears[chest];src=json.loads((BP/'items'/(chest+'.json')).read_text())['minecraft:item']['components'];protect=src['minecraft:wearable']['protection'];dur=src['minecraft:durability']['max_durability']
  entry={'description':{'identifier':'hakkai:'+name,'menu_category':{'category':'equipment'}},'components':{'minecraft:display_name':{'value':f'item.hakkai:{name}.name'},'minecraft:icon':'hakkai_'+name,'minecraft:max_stack_size':1,'minecraft:wearable':{'slot':'slot.armor.legs','protection':max(1,min(8,protect))},'minecraft:durability':{'max_durability':dur},'minecraft:enchantable':{'slot':'armor_legs','value':12}}}
  write(BP/'items'/(name+'.json'),{'format_version':'1.26.60','minecraft:item':entry})
  ingredients=['minecraft:iron_leggings',f'hakkai:crystal_{g["a"]}',f'hakkai:shard_{i}']
  write(BP/'recipes'/(name+'.json'),{'format_version':'1.21.90','minecraft:recipe_shapeless':{'description':{'identifier':'hakkai:'+name},'tags':['crafting_table'],'ingredients':[{'item':x} for x in ingredients],'result':{'item':'hakkai:'+name,'count':1}}})
  # Leg armor uses the chest's existing palette/UV so that it matches the set.
  im=Image.open(EQ/(chest+'.png')).convert('RGBA');im.save(EQ/(name+'.png'));normals(im).save(EQ/(name+'_n.png'))
  mer=Image.open(EQ/(chest+'_mer.png')).convert('RGBA');mer.save(EQ/(name+'_mer.png'))
  write(EQ/(name+'.texture_set.json'),{'format_version':'1.16.100','minecraft:texture_set':{'color':name,'normal':name+'_n','metalness_emissive_roughness':name+'_mer'}})
  attach=json.loads((RP/'attachables/ult_leggings.json').read_text());desc=attach['minecraft:attachable']['description'];desc['identifier']='hakkai:'+name;desc['textures']['default']='textures/hakkai/equipment/'+name;desc['geometry']['default']='geometry.hakkai.armor_leggings';write(RP/'attachables'/(name+'.json'),attach)
  icon=recolor(Image.open(RP/'textures/items/hakkai_ult_leggings.png').convert('RGBA'),g['a'],.72)
  draw=ImageDraw.Draw(icon);draw.rectangle((49,41,78,46),fill=(36+i*3,25+i*2,62+i*4,255));draw.rectangle((58,40,61+i%5*2,46),fill=(240,214,131,255));save_with_maps(icon,RP/'textures/items'/('hakkai_'+name+'.png'))
  atlas['texture_data']['hakkai_'+name]={'textures':'textures/items/hakkai_'+name}
  if name not in progress['derived_extra_existing']:progress['derived_extra_existing'].append(name)
  for lang in texts:
   key=f'item.hakkai:{name}.name=';texts[lang]=[line for line in texts[lang] if not line.startswith(key)];texts[lang].append(key+(title+'のレギンス' if lang=='ja_JP' else f'Realm Armor Leggings {i+1}'))
  for n,part in [(head,'helmet'),(chest,'chest'),(boot,'boots')]:update_attach(n,part);normals(Image.open(EQ/(n+'.png')).convert('RGBA')).save(EQ/(n+'_n.png'))
 for part in ['helmet','chest','leggings','boots']:
  name='ult_'+part;update_attach(name,part);normals(Image.open(EQ/(name+'.png')).convert('RGBA')).save(EQ/(name+'_n.png'))
 write(atlas_path,atlas);write(prog_path,progress)
 for lang,lines in texts.items():(RP/'texts'/(lang+'.lang')).write_text('\n'.join(lines)+'\n',encoding='utf8')
 # Restore the canonical grouped names and recipes after rebuilding art assets.
 import subprocess,sys
 subprocess.run([sys.executable,str(ROOT/'tools/organize_armor_series.py')],check=True)
 print('11 leggings, 11 series plus final armor raised geometry and non-flat normal maps created')
if __name__=='__main__' and '--allow-legacy-overwrite' not in __import__('sys').argv:
 raise SystemExit('Legacy generator would overwrite current armor. Pass --allow-legacy-overwrite explicitly; rebuild current armor afterwards.')
if __name__=='__main__':main()
