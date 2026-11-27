#!/usr/bin/env python3
"""Derive player-held blades from the boss's authored swords, without modifying them.

Visual placement and animation are static prototypes, requiring Bedrock testing.
"""
import copy, json
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
BP=ROOT/'Hakkai_v7.1.0/BehaviorPack'; RP=ROOT/'Hakkai_v7.1.0/ResourcePack'
JP=['風裂の剣','霧縫いの剣','砂葬の剣','氷鏡の剣','雷迅の剣','深影の剣','雲翼の剣','時環の剣']
EN=['Windrending Sword','Mistweaver Sword','Sandburial Sword','Ice Mirror Sword','Thunderflash Sword','Deep Shadow Sword','Cloudwing Sword','Time Ring Sword']
def write(p,o):p.write_text(json.dumps(o,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
atlaspath=RP/'textures/item_texture.json';atlas=json.loads(atlaspath.read_text(encoding='utf8'))
for i in range(8):
 name=f'warden_blade_{i}';ident='hakkai:'+name
 item=copy.deepcopy(json.loads((BP/'items/ult_sword.json').read_text(encoding='utf8')))
 d=item['minecraft:item'];d['description']['identifier']=ident;d['components']['minecraft:display_name']['value']=f'item.{ident}.name';d['components']['minecraft:icon']='hakkai_'+name;d['components']['minecraft:damage']=27
 write(BP/'items'/f'{name}.json',item)
 rec=copy.deepcopy(json.loads((BP/'recipes/ult_sword.json').read_text(encoding='utf8')));r=rec['minecraft:recipe_shapeless'];r['description']['identifier']=ident;r['ingredients']=[{'item':x} for x in ['minecraft:netherite_sword','hakkai:warden_core',f'hakkai:guardian_core_{i}',f'hakkai:crystal_{i}']];r['result']['item']=ident
 write(BP/'recipes'/f'{name}.json',rec)
 # Copy the exact boss blade cubes/UV, then reduce and move into the standard
 # held-item space; the boss's model and existing animations are untouched.
 g=copy.deepcopy(json.loads((RP/'models/entity'/f'warden_sword_{i}.geo.json').read_text(encoding='utf8')));geo=g['minecraft:geometry'][0];geo['description']['identifier']='geometry.hakkai.'+name;geo['description']['visible_bounds_width']=4;geo['description']['visible_bounds_height']=4
 weapon=geo['bones'][0];weapon['name']='blade';weapon['parent']='prop';weapon['pivot']=[0,24,0]
 for c in weapon['cubes']:
  c['origin']=[round(c['origin'][0]*.7,4),round(24+(c['origin'][1]-3.5)*.7,4),round(c['origin'][2]*.7,4)];c['size']=[round(v*.7,4) for v in c['size']]
  if 'pivot' in c:c['pivot']=[round(c['pivot'][0]*.7,4),round(24+(c['pivot'][1]-3.5)*.7,4),round(c['pivot'][2]*.7,4)]
 geo['bones'].insert(0,{'name':'prop','binding':'q.item_slot_to_bone_name(c.item_slot)','pivot':[0,24,0]})
 write(RP/'models/entity'/f'{name}.geo.json',g)
 a=copy.deepcopy(json.loads((RP/'attachables/gear_008.json').read_text(encoding='utf8')));d=a['minecraft:attachable']['description'];d['identifier']=ident;d['textures']['default']=f'textures/entity/hakkai_warden_sword_{i}';d['geometry']['default']='geometry.hakkai.'+name;d['animations']['motion']='animation.hakkai.warden_blade.motion';d['scripts']['animate'].append('motion');write(RP/'attachables'/f'{name}.json',a)
 # Compact inventory art derived from the boss material atlas rather than an
 # extra large client texture. This is only the icon, not the held model.
 # Draw a recognizable inventory silhouette in the realm's blade colours.
 colors=[(149,222,156),(119,190,143),(225,177,91),(150,221,245),(243,204,83),(160,123,204),(197,227,245),(224,185,104)]
 icon=Image.new('RGBA',(64,64),(0,0,0,0));draw=ImageDraw.Draw(icon);accent=colors[i]
 draw.polygon([(17,46),(39,15),(52,7),(48,22),(25,50)],fill=(*accent,255),outline=(35,38,48,255),width=2)
 draw.line([(23,44),(46,14)],fill=(239,240,226,255),width=2)
 draw.line([(13,38),(29,51)],fill=(65,57,49,255),width=5);draw.line([(20,47),(10,57)],fill=(70,49,40,255),width=5)
 draw.ellipse((8,54,14,60),fill=(*accent,255),outline=(35,38,48,255));icon.resize((128,128),Image.Resampling.LANCZOS).save(RP/'textures/items'/f'hakkai_{name}.png',optimize=True)
 atlas['texture_data']['hakkai_'+name]={'textures':'textures/items/hakkai_'+name}
for lang,labels in [('ja_JP',JP),('en_US',EN)]:
 p=RP/'texts'/f'{lang}.lang';lines=p.read_text(encoding='utf8').splitlines();lines=[x for x in lines if not any(x.startswith(f'item.hakkai:warden_blade_{i}.name=') for i in range(8))];lines += [f'item.hakkai:warden_blade_{i}.name={label}' for i,label in enumerate(labels)];p.write_text('\n'.join(lines)+'\n',encoding='utf8')
write(atlaspath,atlas)
write(RP/'animations/warden_blade.animation.json',{'format_version':'1.8.0','animations':{'animation.hakkai.warden_blade.motion':{'loop':True,'bones':{'blade':{'rotation':[0,0,'math.sin(query.anim_time * 90) * 3']}}}}})
print('Player warden sword prototypes generated; placement requires in-game testing')
