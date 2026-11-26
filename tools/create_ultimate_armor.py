#!/usr/bin/env python3
"""Generate the prototype final armor's definitions and derived textures.
Requires Pillow. Existing icon templates are retained; all textures are original
pack assets recolored for a consistent violet/gold endgame set.
"""
# Historical generator: it replaces current item art and/or wearable assets.
import sys
if __name__ == '__main__' and '--allow-legacy-overwrite' not in sys.argv:
 raise SystemExit('Legacy generator would overwrite current armor. Pass --allow-legacy-overwrite explicitly; rebuild current armor afterwards.')

from pathlib import Path
import json
from PIL import Image, ImageDraw
from import_item_art import save_with_maps
from create_series_armor import normals
root=Path(__file__).resolve().parents[1];bp=root/'Hakkai_v7.1.0/BehaviorPack';rp=root/'Hakkai_v7.1.0/ResourcePack'
def write(path,value):
 path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
parts={'helmet':('head','armor_head',11,750,'gear_011','helmet'),'chest':('chest','armor_torso',20,3600,'gear_186','chestplate'),'leggings':('legs','armor_legs',8,950,'gear_186','leggings'),'boots':('feet','armor_feet',8,850,'gear_012','boots')}
# Draw a distinct inventory icon for the formerly unfinished leggings.
im=Image.new('RGBA',(128,128),(0,0,0,0));d=ImageDraw.Draw(im)
d.polygon([(24,22),(104,22),(99,53),(90,109),(68,111),(64,68),(60,111),(38,109),(29,53)],fill=(42,27,73,255),outline=(230,186,91,255),width=4)
d.rectangle((28,25,100,38),fill=(92,57,126,255),outline=(255,220,135,255),width=2)
d.polygon([(61,25),(67,25),(72,30),(64,40),(56,30)],fill=(172,237,236,255))
for x in (41,79):
 d.polygon([(x-6,50),(x+6,50),(x+5,98),(x-5,98)],fill=(80,58,121,255),outline=(176,139,95,255),width=2)
 for y in range(54,96,5):d.line((x-3,y,x+3,y-2),fill=(123+y//4,88+y//6,155+y//8,255),width=2)
d.line([(31,40),(46,45),(64,44),(82,45),(97,40)],fill=(218,178,98,255),width=2)
# Subtle deterministic woven texture over each colored panel.
px=im.load()
for y in range(128):
 for x in range(128):
  r,g,b,a=px[x,y]
  if a:
   n=((x*13+y*7+(x*y)%11)%9)-4;px[x,y]=(max(0,min(255,r+n)),max(0,min(255,g+n)),max(0,min(255,b+n)),a)
save_with_maps(im,rp/'textures/items/hakkai_ult_leggings.png')
atlas_path=rp/'textures/item_texture.json';atlas=json.loads(atlas_path.read_text(encoding='utf8'))
for part,(slot,enchant,protection,durability,source,geo) in parts.items():
 name='ult_'+part;ident='hakkai:'+name
 comps={'minecraft:display_name':{'value':'item.'+ident+'.name'},'minecraft:icon':'hakkai_'+name,'minecraft:max_stack_size':1,'minecraft:wearable':{'slot':'slot.armor.'+slot,'protection':protection},'minecraft:durability':{'max_durability':durability},'minecraft:enchantable':{'slot':enchant,'value':15}}
 write(bp/'items'/f'{name}.json',{'format_version':'1.26.60','minecraft:item':{'description':{'identifier':ident,'menu_category':{'category':'equipment'}},'components':comps}})
 base={'helmet':'minecraft:netherite_helmet','chest':'minecraft:netherite_chestplate','leggings':'minecraft:netherite_leggings','boots':'minecraft:netherite_boots'}[part]
 write(bp/'recipes'/f'{name}.json',{'format_version':'1.21.90','minecraft:recipe_shapeless':{'description':{'identifier':ident},'tags':['crafting_table'],'ingredients':[{'item':base},{'item':'hakkai:warden_core'},{'item':'hakkai:crystal_7'},{'item':'hakkai:shard_9'}],'result':{'item':ident,'count':1}}})
 tex=rp/'textures/hakkai/equipment';img=Image.open(tex/(source+'.png')).convert('RGBA').resize((256,256),Image.Resampling.NEAREST)
 # Recolor only visible pixels; preserve UV transparency of the source layout.
 px=img.load()
 for y in range(256):
  for x in range(256):
   r,g,b,a=px[x,y]
   if a:
    if r>g*1.12 and g>b*1.1: px[x,y]=(r,g,b,a) # gold accents
    else:px[x,y]=(min(255,int(r*.72+27)),min(255,int(g*.65+15)),min(255,int(b*.95+34)),a)
 img.save(tex/(name+'.png'))
 normals(img).save(tex/(name+'_n.png'))
 mer=Image.new('RGBA',(256,256),(0,0,0,0));mer.putalpha(img.getchannel('A'));mp=mer.load()
 for y in range(256):
  for x in range(256):
   if mp[x,y][3]:mp[x,y]=(70,0,170,mp[x,y][3])
 mer.save(tex/(name+'_mer.png'))
 write(tex/(name+'.texture_set.json'),{'format_version':'1.16.100','minecraft:texture_set':{'color':name,'normal':name+'_n','metalness_emissive_roughness':name+'_mer'}})
 # Vanilla armor geometry for leggings; other parts mirror existing pack definitions.
 if part=='leggings':
  desc={'identifier':ident,'materials':{'default':'armor','enchanted':'armor_enchanted'},'textures':{'default':'textures/hakkai/equipment/'+name,'enchanted':'textures/misc/enchanted_actor_glint'},'geometry':{'default':'geometry.humanoid.armor.leggings'},'scripts':{'parent_setup':'variable.leg_layer_visible = 0.0;'},'render_controllers':['controller.render.armor']}
 else:
  a=json.loads((rp/'attachables'/(source+'.json')).read_text());desc=a['minecraft:attachable']['description'];desc['identifier']=ident;desc['textures']['default']='textures/hakkai/equipment/'+name
 desc['geometry']['default']='geometry.hakkai.armor_'+part
 write(rp/'attachables'/(name+'.json'),{'format_version':'1.10.0','minecraft:attachable':{'description':desc}})
 atlas['texture_data']['hakkai_'+name]={'textures':'textures/items/hakkai_'+name}
write(atlas_path,atlas)
progress_path=root/'texture_progress.json';progress=json.loads(progress_path.read_text(encoding='utf8'))
for part in parts:
 name='ult_'+part
 if name in progress['planned_art_only']:progress['planned_art_only'].remove(name)
 if name not in progress['derived_extra_existing']:progress['derived_extra_existing'].append(name)
write(progress_path,progress)
for lang in ('ja_JP','en_US'):
 path=rp/'texts'/(lang+'.lang');s=path.read_text(encoding='utf8')
 for part in parts:
  key='item.hakkai:ult_'+part+'.name';translation={'helmet':'終刻の兜','chest':'終刻の鎧','leggings':'終刻のレギンス','boots':'終刻の靴'}[part] if lang=='ja_JP' else {'helmet':'Final Hour Helmet','chest':'Final Hour Chestplate','leggings':'Final Hour Leggings','boots':'Final Hour Boots'}[part]
  lines=s.splitlines();lines=[line for line in lines if not line.startswith(key+'=')];s='\n'.join(lines)+'\n'+key+'='+translation+'\n'
 path.write_text(s,encoding='utf8')
print('Final armor definitions, recipes, four derived wearable textures, leggings icon and locale entries created')
