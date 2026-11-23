import json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=root/'BehaviorPack';rp=root/'ResourcePack'
for part,slot in [('helmet','head'),('chest','chest'),('leggings','legs'),('boots','feet')]:
 name=f'ult_{part}';item=json.loads((bp/'items'/f'{name}.json').read_text())['minecraft:item'];c=item['components']
 assert item['description']['identifier']==f'hakkai:{name}'
 assert c['minecraft:wearable']['slot']==f'slot.armor.{slot}' and c['minecraft:wearable']['protection']>0
 recipe=json.loads((bp/'recipes'/f'{name}.json').read_text())['minecraft:recipe_shapeless']
 assert {x['item'] for x in recipe['ingredients']}=={f'minecraft:netherite_{"chestplate" if part=="chest" else part}','hakkai:warden_core','hakkai:crystal_7','hakkai:shard_9'}
 assert recipe['result']['item']==f'hakkai:{name}'
 attach=json.loads((rp/'attachables'/f'{name}.json').read_text())['minecraft:attachable']['description']
 assert attach['identifier']==f'hakkai:{name}' and attach['textures']['default']==f'textures/hakkai/equipment/{name}'
 for suffix in ('','_n','_mer'):
  assert Image.open(rp/f'textures/hakkai/equipment/{name}{suffix}.png').size==(256,256)
 assert (rp/f'textures/hakkai/equipment/{name}.texture_set.json').exists()
 for lang in ['ja_JP','en_US']:assert f'item.hakkai:{name}.name=' in (rp/'texts'/f'{lang}.lang').read_text()
print('Final armor: 4 definitions, unique upgrade recipes, attachables and 256px texture maps (static only)')
