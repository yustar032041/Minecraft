"""Static pack checks; no claim of Bedrock rendering or live crafting."""
import json
from pathlib import Path
from PIL import Image
R=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';BP=R/'BehaviorPack';RP=R/'ResourcePack'
def load(p):return json.loads(p.read_text(encoding='utf8'))
atlas=load(RP/'textures/item_texture.json')['texture_data']
anim=load(RP/'animations/warden_blade.animation.json')['animations']['animation.hakkai.warden_blade.motion']
assert anim['loop'] and 'query.anim_time' in str(anim['bones']['blade'])
for i in range(8):
 name=f'warden_blade_{i}';ident=f'hakkai:{name}'
 item=load(BP/'items'/f'{name}.json')['minecraft:item'];assert item['description']['identifier']==ident
 assert item['components']['minecraft:icon']==f'hakkai_{name}' and item['components']['hakkai:use']=={}
 recipe=load(BP/'recipes'/f'{name}.json')['minecraft:recipe_shapeless'];assert recipe['result']['item']==ident
 assert {x['item'] for x in recipe['ingredients']}=={'minecraft:netherite_sword','hakkai:warden_core',f'hakkai:guardian_core_{i}',f'hakkai:crystal_{i}'}
 a=load(RP/'attachables'/f'{name}.json')['minecraft:attachable']['description'];assert a['identifier']==ident and a['textures']['default']==f'textures/entity/hakkai_warden_sword_{i}'
 assert a['geometry']['default']==f'geometry.hakkai.{name}' and a['animations']['motion']=='animation.hakkai.warden_blade.motion'
 model=load(RP/'models/entity'/f'{name}.geo.json')['minecraft:geometry'][0];boss=load(RP/'models/entity'/f'warden_sword_{i}.geo.json')['minecraft:geometry'][0]
 assert model['description']['identifier']==a['geometry']['default'];assert model['bones'][0]['binding']=='q.item_slot_to_bone_name(c.item_slot)'
 assert len(model['bones'][1]['cubes'])==len(boss['bones'][0]['cubes'])
 assert [c['uv'] for c in model['bones'][1]['cubes']]==[c['uv'] for c in boss['bones'][0]['cubes']]
 assert atlas[f'hakkai_{name}']['textures']==f'textures/items/hakkai_{name}'
 with Image.open(RP/'textures/items'/f'hakkai_{name}.png') as img:assert img.size==(128,128) and img.getchannel('A').getextrema()==(0,255)
 for lang in ('ja_JP','en_US'):assert f'item.{ident}.name=' in (RP/'texts'/f'{lang}.lang').read_text(encoding='utf8')
print('Eight player warden blades: recipes, held geometry, animation, icons and references OK (static only)')
