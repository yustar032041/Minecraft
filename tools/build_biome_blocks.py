#!/usr/bin/env python3
"""Generate eight small, realm-specific decorative terrain blocks."""
from pathlib import Path
import json,random
from PIL import Image,ImageDraw
r=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=r/'BehaviorPack';rp=r/'ResourcePack'
def read(p):return json.loads(p.read_text(encoding='utf8'))
def save(p,j):p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
blocks=[('wind_soil','風花の土','Windflower Soil','#657a53','#c8b995'),('mist_loam','露苔の土','Dewmoss Loam','#3f6350','#a3c6a3'),('sun_silt','日照の砂土','Sunlit Silt','#c29a65','#f0d498'),('rime_soil','霜覆いの地','Rime Soil','#8fb3bb','#def5f2'),('storm_grit','雷礫の地','Storm Grit','#5b626a','#bb9b69'),('deep_loam','燐苔の土','Phosphor Loam','#33484a','#7ed0aa'),('cloud_loam','雲草の地','Cloud Loam','#a0bcb5','#eef3db'),('epoch_soil','月影の時土','Moonlit Epoch Soil','#615c70','#c6af92')]
a=rp/'textures/terrain_texture.json';atlas=read(a)
for idx,(name,ja,en,base,highlight) in enumerate(blocks):
 j=read(bp/'blocks/windworn_sandstone.json');b=j['minecraft:block'];b['description']['identifier']='hakkai:'+name;b['components']['minecraft:display_name']=f'tile.hakkai:{name}.name';b['components']['minecraft:loot']=f'loot_tables/hakkai/blocks/{name}.json';b['components']['minecraft:material_instances']['*']['texture']='hakkai_'+name;b['components']['minecraft:map_color']=base;save(bp/f'blocks/{name}.json',j)
 save(bp/f'loot_tables/hakkai/blocks/{name}.json',{'pools':[{'rolls':1,'entries':[{'type':'item','name':'hakkai:'+name,'weight':1}]}]})
 rand=random.Random(521+idx);im=Image.new('RGB',(32,32),base);d=ImageDraw.Draw(im)
 for _ in range(90):
  x,y=rand.randrange(32),rand.randrange(32);l=rand.randrange(1,4);d.line((x,y,min(31,x+l),y),fill=highlight,width=1)
 for _ in range(18):
  x,y=rand.randrange(32),rand.randrange(32);d.point((x,y),fill='#36454a')
 im.save(rp/f'textures/blocks/hakkai_{name}.png',optimize=True);atlas['texture_data']['hakkai_'+name]={'textures':'textures/blocks/hakkai_'+name}
 for lang,label in [('ja_JP',ja),('en_US',en)]:
  p=rp/f'texts/{lang}.lang';key=f'tile.hakkai:{name}.name=';lines=[x for x in p.read_text(encoding='utf8').splitlines() if not x.startswith(key)];p.write_text('\n'.join(lines)+'\n'+key+label+'\n',encoding='utf8')
save(a,atlas)
