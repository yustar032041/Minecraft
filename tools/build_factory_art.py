#!/usr/bin/env python3
"""Generate small, original block textures and matching block definitions."""
from pathlib import Path
import json
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0'
bp=root/'BehaviorPack';rp=root/'ResourcePack'
names={'shaft':'動力軸','wind_rotor':'風力回転機','water_wheel':'水力回転機','crusher':'破砕機','washer':'洗浄機','press':'プレス機','saw':'製材機','factory_pipe':'搬送管'}
ingredients={'shaft':['minecraft:iron_ingot','minecraft:stick'],'wind_rotor':['minecraft:iron_ingot','minecraft:stick','minecraft:white_wool','hakkai:crystal_0'],'water_wheel':['minecraft:iron_ingot','minecraft:oak_planks','minecraft:bucket','hakkai:crystal_3'],'crusher':['minecraft:piston','minecraft:iron_ingot','minecraft:cobblestone','hakkai:crystal_4'],'washer':['minecraft:bucket','minecraft:iron_ingot','minecraft:barrel','hakkai:crystal_3'],'press':['minecraft:piston','minecraft:iron_ingot','minecraft:anvil','hakkai:crystal_4'],'saw':['minecraft:iron_ingot','minecraft:iron_ingot','minecraft:stonecutter_block','hakkai:crystal_0'],'factory_pipe':['minecraft:hopper','minecraft:iron_ingot','minecraft:copper_ingot']}
def save(path,obj):path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
atlas=rp/'textures/terrain_texture.json';a=json.loads(atlas.read_text())
for name,label in names.items():
 moving=name in ('shaft','wind_rotor','water_wheel')
 animated=moving or name in ('crusher','washer','press','saw')
 im=Image.new('RGBA',(32,32),(55,49,45,255));d=ImageDraw.Draw(im)
 d.rectangle((1,1,30,30),fill='#69523d',outline='#be985b',width=2)
 d.rectangle((4,4,27,27),fill={'crusher':'#514d48','washer':'#315a6a','press':'#6c5253','saw':'#725d43','shaft':'#594f45','wind_rotor':'#768a92','water_wheel':'#285b73','factory_pipe':'#536e70'}[name],outline='#d1aa68',width=2)
 d.ellipse((7,7,25,25),fill='#383b40',outline='#d6a85f',width=2)
 if name=='crusher':
  d.polygon([(8,10),(13,7),(17,13),(22,8),(25,12),(20,18),(24,22),(19,25),(16,19),(10,24),(7,19),(12,16)],fill='#d7c9a0')
 elif name=='washer':
  d.arc((7,8,25,25),10,300,fill='#74d5f3',width=3);d.polygon([(12,13),(16,8),(20,13),(16,19)],fill='#9de7fa')
 elif name=='press':
  d.rectangle((9,8,23,12),fill='#dbb67c');d.rectangle((13,12,19,19),fill='#c9d0d1');d.rectangle((9,20,23,23),fill='#d68961')
 elif name=='factory_pipe':
  d.rectangle((6,12,25,20),fill='#aab3ae',outline='#e4b778',width=2);d.polygon([(16,13),(23,16),(16,19)],fill='#334b4c')
 elif name=='saw':
  for x in range(8,25,4):d.line((x,9,x,23),fill='#d9d9cb',width=2)
  d.line((7,16,25,16),fill='#886139',width=3)
 else:
  # Irregular blades retain obvious motion between quarter-turn frames.
  color={'shaft':'#d4ac72','wind_rotor':'#f4e7c6','water_wheel':'#a9dce8'}[name]
  d.polygon([(14,15),(12,5),(17,5),(19,13),(26,11),(26,16),(19,18),(20,26),(15,26),(13,19),(5,21),(5,16)],fill=color)
  d.ellipse((13,13,19,19),fill='#51545a',outline='#edc87c')
 frames=4 if animated else 1
 for i in range(frames):
  key=f'hakkai_{name}'+(f'_{i}' if animated else '')
  frame=im.rotate(-90*i) if moving else im.copy()
  if animated and not moving:
   brush=ImageDraw.Draw(frame);brush.rectangle((8,26,10+4*i,28),fill='#ffdd73');brush.point((23-i*3,4),fill='#fff4c0')
  frame.save(rp/f'textures/blocks/{key}.png',optimize=True)
  a['texture_data'][key]={'textures':f'textures/blocks/{key}'}
 base=json.loads((bp/'blocks/mill.json').read_text())
 block=base['minecraft:block'];block['description']['identifier']='hakkai:'+name
 block['components']['minecraft:display_name']=f'tile.hakkai:{name}.name'
 block['components']['minecraft:loot']=f'loot_tables/hakkai/blocks/{name}.json'
 block['components']['minecraft:material_instances']['*']['texture']=f'hakkai_{name}'+('_0' if animated else '')
 if animated:
  block['description']['states']={'hakkai:spin':[0,1,2,3]}
  if moving:block['components']['minecraft:tick']={'interval_range':[12,16],'looping':True}
  block['permutations']=[{'condition':f"q.block_state('hakkai:spin') == {i}",'components':{'minecraft:material_instances':{'*':{'texture':f'hakkai_{name}_{i}','render_method':'opaque'}}}} for i in range(1,4)]
 save(bp/f'blocks/{name}.json',base)
 loot={'pools':[{'rolls':1,'entries':[{'type':'item','name':'hakkai:'+name}]}]};save(bp/f'loot_tables/hakkai/blocks/{name}.json',loot)
 recipe={'format_version':'1.21.90','minecraft:recipe_shapeless':{'description':{'identifier':'hakkai:'+name},'tags':['crafting_table'],'ingredients':[{'item':i} for i in ingredients[name]],'result':{'item':'hakkai:'+name,'count':4 if name=='shaft' else 1}}};save(bp/f'recipes/{name}.json',recipe)
for lang in ('ja_JP','en_US'):
 p=rp/f'texts/{lang}.lang';s=p.read_text(encoding='utf8')
 for name,label in names.items():
  line=f'tile.hakkai:{name}.name={label}'
  if line not in s:s+='\n'+line
 p.write_text(s.rstrip()+'\n',encoding='utf8')
save(atlas,a)

# Reapply the later kinetic geometry and tick definitions when regenerating art.
import runpy
runpy.run_path(str(Path(__file__).with_name("build_kinetic_assets.py")),run_name="__main__")
