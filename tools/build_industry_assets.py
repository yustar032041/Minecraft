#!/usr/bin/env python3
"""Generate original industrial guide, processed ores and directional pipes."""
from pathlib import Path
import json
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=root/'BehaviorPack';rp=root/'ResourcePack'
def read(p):return json.loads(p.read_text(encoding='utf8'))
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
atlasp=rp/'textures/item_texture.json';atlas=read(atlasp)
orecolors={'iron':('#bba58f','#efe1c6','鉄'),'gold':('#c69731','#ffe36e','金'),'copper':('#b5693d','#f4a76f','銅')}
names={'industrial_guide':'工業ガイド本'}
for metal,(_,_,jp) in orecolors.items():
 for stage in ('crushed','washed'):names[f'{stage}_{metal}']=('砕いた原'+jp if stage=='crushed' else '洗浄済み原'+jp)
for name,label in names.items():
 source='guide' if name=='industrial_guide' else 'crystal_0'
 j=read(bp/f'items/{source}.json');it=j['minecraft:item'];it['description']['identifier']='hakkai:'+name;it['components']['minecraft:display_name']['value']='item.hakkai:'+name+'.name';it['components']['minecraft:icon']='hakkai_'+name
 write(bp/f'items/{name}.json',j)
 icon=Image.new('RGBA',(128,128),(0,0,0,0));d=ImageDraw.Draw(icon)
 if name=='industrial_guide':
  d.rounded_rectangle((17,12,110,116),radius=8,fill='#593b27',outline='#e4b765',width=5);d.rectangle((26,18,102,108),fill='#2f7880',outline='#dfb65c',width=4)
  d.ellipse((40,37,89,87),fill='#c89145',outline='#f7e3a2',width=5);d.ellipse((55,52,74,72),fill='#45636a',outline='#463627',width=3)
  for x,y in [(60,27),(60,85),(31,56),(89,56)]:d.rectangle((x,y,x+9,y+15),fill='#e3be77')
 else:
  stage,metal=name.split('_',1);base,highlight,_=orecolors[metal]
  d.polygon([(18,86),(27,58),(41,53),(49,28),(70,35),(83,24),(104,47),(108,87),(90,106),(53,111),(25,104)],fill='#433b37',outline='#e5c999',width=4)
  d.polygon([(27,84),(39,61),(53,64),(52,42),(71,45),(81,35),(99,53),(98,87),(85,97),(54,101),(33,95)],fill=base)
  for xy in [(40,66,52,78),(68,51,80,65),(79,75,94,87)]:d.rectangle(xy,fill=highlight)
  if stage=='washed':
   d.arc((18,18,113,113),190,330,fill='#64d9f3',width=7);d.polygon([(21,41),(29,28),(36,41),(29,49)],fill='#b8f4ff')
 # The guide has independent HD artwork; never overwrite it with the old sketch.
 if name!='industrial_guide':icon.save(rp/f'textures/items/hakkai_{name}.png',optimize=True)
 atlas['texture_data']['hakkai_'+name]={'textures':f'textures/items/hakkai_{name}'}
for lang in ('ja_JP','en_US'):
 p=rp/f'texts/{lang}.lang';s=p.read_text(encoding='utf8').rstrip()
 for name,label in names.items():
  line=f'item.hakkai:{name}.name={label}'
  if line not in s:s+='\n'+line
 p.write_text(s+'\n',encoding='utf8')
write(atlasp,atlas)
p=rp/'textures/terrain_texture.json';terrain=read(p)
for direction,jp,ingredient,color in [('west','西','minecraft:redstone','#e96953'),('north','北','minecraft:flint','#b9c8ce'),('south','南','minecraft:string','#e8dda9'),('up','上','minecraft:feather','#b1dfee'),('down','下','minecraft:gravel','#b5a08a')]:
 name='factory_pipe_'+direction
 base=read(bp/'blocks/factory_pipe.json');b=base['minecraft:block'];b['description']['identifier']='hakkai:'+name;b['components']['minecraft:display_name']=f'tile.hakkai:{name}.name';b['components']['minecraft:loot']=f'loot_tables/hakkai/blocks/{name}.json';b['components']['minecraft:material_instances']['*']['texture']='hakkai_'+name;write(bp/f'blocks/{name}.json',base)
 write(bp/f'loot_tables/hakkai/blocks/{name}.json',{'pools':[{'rolls':1,'entries':[{'type':'item','name':'hakkai:'+name}]}]})
 write(bp/f'recipes/{name}.json',{'format_version':'1.21.90','minecraft:recipe_shapeless':{'description':{'identifier':'hakkai:'+name},'tags':['crafting_table'],'ingredients':[{'item':'hakkai:factory_pipe'},{'item':ingredient}],'result':{'item':'hakkai:'+name,'count':1}}})
 im=Image.new('RGBA',(32,32),'#424947');d=ImageDraw.Draw(im);d.rectangle((1,1,30,30),outline='#b59161',width=2);d.rectangle((5,11,26,21),fill='#a9b6ac',outline='#dfc18b',width=2)
 points={'west':[(9,16),(17,11),(17,14),(23,14),(23,18),(17,18),(17,21)],'north':[(16,7),(11,15),(14,15),(14,23),(18,23),(18,15),(21,15)],'south':[(16,25),(11,17),(14,17),(14,9),(18,9),(18,17),(21,17)],'up':[(16,7),(10,16),(14,16),(14,23),(18,23),(18,16),(22,16)],'down':[(16,25),(10,16),(14,16),(14,9),(18,9),(18,16),(22,16)]}[direction];d.polygon(points,fill=color);d.rectangle((3,3,6,6),fill=color)
 im.save(rp/f'textures/blocks/hakkai_{name}.png',optimize=True);terrain['texture_data']['hakkai_'+name]={'textures':f'textures/blocks/hakkai_{name}'}
 for lang in ('ja_JP','en_US'):
  q=rp/f'texts/{lang}.lang';s=q.read_text(encoding='utf8').rstrip();line=f'tile.hakkai:{name}.name=搬送管（{jp}行き）'
  if line not in s:q.write_text(s+'\n'+line+'\n',encoding='utf8')
write(p,terrain)

# A manual clutch separates networks when switched off. Preserve its state.
j=read(bp/'blocks/gear_down.json');b=j['minecraft:block'];b['description']['identifier']='hakkai:clutch';b['description']['states']['hakkai:engaged']=[0,1];b['components']['minecraft:display_name']='tile.hakkai:clutch.name';b['components']['minecraft:loot']='loot_tables/hakkai/blocks/clutch.json';b['permutations']=[{'condition':"q.block_state('hakkai:engaged') == 1",'components':{'minecraft:material_instances':{'*':{'texture':'hakkai_shaft_2','render_method':'opaque'}}}}];write(bp/'blocks/clutch.json',j)
write(bp/'loot_tables/hakkai/blocks/clutch.json',{'pools':[{'rolls':1,'entries':[{'type':'item','name':'hakkai:clutch'}]}]})
write(bp/'recipes/clutch.json',{'format_version':'1.21.90','minecraft:recipe_shapeless':{'description':{'identifier':'hakkai:clutch'},'tags':['crafting_table'],'ingredients':[{'item':'hakkai:shaft'},{'item':'minecraft:lever'},{'item':'minecraft:iron_ingot'}],'result':{'item':'hakkai:clutch','count':1}}})
for lang in ('ja_JP','en_US'):
 p=rp/f'texts/{lang}.lang';s=p.read_text(encoding='utf8').rstrip();line='tile.hakkai:clutch.name=動力クラッチ'
 if line not in s:p.write_text(s+'\n'+line+'\n',encoding='utf8')
