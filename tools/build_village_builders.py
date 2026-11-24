#!/usr/bin/env python3
"""Eight custom builder entities; reuses the existing resident silhouette."""
from pathlib import Path
from PIL import Image,ImageDraw
import json
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=root/'BehaviorPack';rp=root/'ResourcePack'
names=['風車','霧森','砂路','鏡湖','雷炉','灯苔','雲渡り','時結び']
def read(p):return json.loads(p.read_text(encoding='utf8'))
def save(p,o):p.write_text(json.dumps(o,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
lines=[]
for i,name in enumerate(names):
 ident=f'builder_{i}';src=f'resident_{i}_2';b=read(bp/f'entities/{src}.json');e=b['minecraft:entity'];e['description']['identifier']='hakkai:'+ident;e['components']['minecraft:type_family']['family']=['mob','hakkai_builder'];save(bp/f'entities/{ident}.json',b)
 c=read(rp/f'entity/{src}.entity.json');desc=c['minecraft:client_entity']['description'];desc['identifier']='hakkai:'+ident;desc['textures']['default']='textures/entity/'+ident;desc['spawn_egg']['overlay_color']='#efc34f';save(rp/f'entity/{ident}.entity.json',c)
 im=Image.open(rp/f'textures/entity/{src}.png').convert('RGBA');d=ImageDraw.Draw(im);d.rectangle((96,0,111,15),fill='#d2a832');d.rectangle((96,9,111,11),fill='#73512c');d.rectangle((48,0,63,15),fill='#e8d49a');d.line((51,4,60,12),fill='#73512c',width=2);d.line((60,4,51,12),fill='#73512c',width=2);im.save(rp/f'textures/entity/{ident}.png')
 lines += [f'entity.hakkai:{ident}.name={name}の建築係',f'item.spawn_egg.entity.hakkai:{ident}.name={name}の建築係のスポーンエッグ']
for loc in ['ja_JP','en_US']:
 path=rp/f'texts/{loc}.lang';s=path.read_text(encoding='utf8');a='## HAKKAI_BUILDERS_START';b='## HAKKAI_BUILDERS_END'
 if a in s:s=s[:s.index(a)]+s[s.index(b)+len(b):].lstrip('\n')
 path.write_text(s.rstrip()+'\n'+a+'\n'+'\n'.join(lines)+'\n'+b+'\n',encoding='utf8')
print('Generated eight builder mobs and hard hats')
