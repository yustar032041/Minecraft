#!/usr/bin/env python3
"""Create machine frames and original line-machine textures."""
from pathlib import Path
import json
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=root/'BehaviorPack';rp=root/'ResourcePack'
def read(p):return json.loads(p.read_text(encoding='utf8'))
def write(p,obj):p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
atlas=rp/'textures/terrain_texture.json';atlasdata=read(atlas)
for name,label,color,parts in [
 ('mixer','動力混合機','#628b8b',['minecraft:cauldron','minecraft:iron_ingot','minecraft:redstone']),
 ('assembler','動力組立機','#99674d',['minecraft:crafting_table','minecraft:piston','minecraft:redstone']),
 ('filter_router','見本式仕分け機','#668463',['minecraft:hopper','minecraft:comparator','minecraft:redstone'])]:
 im=Image.new('RGBA',(32,32),'#514132');d=ImageDraw.Draw(im);d.rectangle((2,2,29,29),fill=color,outline='#d8b77d',width=2);d.ellipse((7,7,25,25),fill='#343c3e',outline='#e4bf76',width=2)
 if name=='mixer':
  d.line((10,11,22,21),fill='#b6eff0',width=3);d.line((22,11,10,21),fill='#e8cd82',width=3)
 elif name=='assembler':
  d.rectangle((9,9,23,13),fill='#ebbe75');d.rectangle((13,14,19,23),fill='#cfd4c5')
 else:
  d.line((9,10,22,10),fill='#e8e0c0',width=2);d.line((16,10,16,21),fill='#e8e0c0',width=2);d.line((16,17,22,21),fill='#a0dfb0',width=2)
 for i in range(4):
  frame=im.copy();draw=ImageDraw.Draw(frame);draw.rectangle((8,26,10+i*4,28),fill='#ffe18a');key=f'hakkai_{name}_{i}';frame.save(rp/f'textures/blocks/{key}.png',optimize=True);atlasdata['texture_data'][key]={'textures':'textures/blocks/'+key}
 base=read(bp/'blocks/crusher.json');b=base['minecraft:block'];b['description']['identifier']='hakkai:'+name;b['components']['minecraft:display_name']=f'tile.hakkai:{name}.name';b['components']['minecraft:loot']=f'loot_tables/hakkai/blocks/{name}.json';b['components']['minecraft:material_instances']['*']['texture']=f'hakkai_{name}_0'
 if name=='filter_router':b['components']['minecraft:geometry']='minecraft:geometry.full_block'
 for i,permutation in enumerate(b['permutations'],1):permutation['components']['minecraft:material_instances']['*']['texture']=f'hakkai_{name}_{i}'
 write(bp/f'blocks/{name}.json',base)
 write(bp/f'loot_tables/hakkai/blocks/{name}.json',{'pools':[{'rolls':1,'entries':[{'type':'item','name':'hakkai:'+name}]}]})
 write(bp/f'recipes/{name}.json',{'format_version':'1.21.90','minecraft:recipe_shapeless':{'description':{'identifier':'hakkai:'+name},'tags':['crafting_table'],'ingredients':[{'item':p} for p in parts],'result':{'item':'hakkai:'+name,'count':1}}})
 for lang in ['ja_JP','en_US']:
  p=rp/f'texts/{lang}.lang';s=p.read_text(encoding='utf8');line=f'tile.hakkai:{name}.name={label}'
  if line not in s:p.write_text(s.rstrip()+'\n'+line+'\n',encoding='utf8')
write(atlas,atlasdata)
def cube(o,s,uv=[0,0]):return {'origin':o,'size':s,'uv':uv}
cubes=[cube([-8,0,-8],[16,2,16]),cube([-8,2,-8],[2,14,2]),cube([6,2,-8],[2,14,2]),cube([-8,2,6],[2,14,2]),cube([6,2,6],[2,14,2]),cube([-8,14,-8],[16,2,2]),cube([-8,14,6],[16,2,2])]
write(rp/'models/blocks/factory_frame.geo.json',{'format_version':'1.12.0','minecraft:geometry':[{'description':{'identifier':'geometry.hakkai.factory_frame','texture_width':32,'texture_height':32},'bones':[{'name':'frame','pivot':[0,0,0],'cubes':cubes}]}]})
for name in ['crusher','press','saw','washer','mixer','assembler']:
 p=bp/f'blocks/{name}.json';j=read(p);j['minecraft:block']['components']['minecraft:geometry']='geometry.hakkai.factory_frame';write(p,j)
p=bp/'entities/kinetic_visual.json';entity=read(p);entity['minecraft:entity']['description']['properties']['hakkai:kind']['range']=[0,8];write(p,entity)
p=rp/'models/entity/kinetic_visual.geo.json';model=read(p);bones=model['minecraft:geometry'][0]['bones'];bones[:]=[b for b in bones if b['name'] not in ('millwork','ram','mixwork','assembly')]
bones.extend([
 {'name':'millwork','pivot':[0,8,0],'cubes':[cube([-3,3,-5],[6,10,10],[0,32]),cube([-4,6,-7],[8,4,14],[0,32])]},
 {'name':'ram','pivot':[0,8,0],'cubes':[cube([-2,8,-2],[4,6,4],[0,0]),cube([-5,5,-5],[10,3,10],[0,32])]},
 {'name':'mixwork','pivot':[0,8,0],'cubes':[cube([-2,3,-2],[4,10,4],[0,0]),cube([-5,4,-1],[10,2,2],[32,0]),cube([-1,4,-5],[2,2,10],[32,0])]},
 {'name':'assembly','pivot':[0,8,0],'cubes':[cube([-2,4,-5],[4,8,10],[0,32]),cube([-4,6,-2],[8,4,4],[0,0])]}]);write(p,model)
p=rp/'animations/kinetic.animation.json';an=read(p);a=an['animations']['animation.hakkai.kinetic.rotate']['bones'];rot=["math.mod(query.life_time * query.property('hakkai:rpm') * 6, 360)",0,0]
for name in ('millwork','mixwork','assembly'):a[name]={'rotation':rot}
a['ram']={'rotation':["query.property('hakkai:rpm') * 0",0,0],'position':[0,"query.property('hakkai:rpm') != 0 ? math.sin(query.life_time * math.abs(query.property('hakkai:rpm')) * 6) * 3 : 0",0]};write(p,an)
p=rp/'render_controllers/kinetic.render_controllers.json';rc=read(p);vis=rc['render_controllers']['controller.render.hakkai.kinetic']['part_visibility'];vis[:]=[x for x in vis if not set(x)&{'millwork','ram','mixwork','assembly'}];vis.extend([{'millwork':"query.property('hakkai:kind') == 4"},{'ram':"query.property('hakkai:kind') == 5"},{'mixwork':"query.property('hakkai:kind') == 6 || query.property('hakkai:kind') == 7"},{'assembly':"query.property('hakkai:kind') == 8"}]);write(p,rc)
