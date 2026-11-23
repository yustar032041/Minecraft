import json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=root/'BehaviorPack';rp=root/'ResourcePack'
c=json.loads((bp/'items/ult_pickaxe.json').read_text())['minecraft:item']['components']
assert c['minecraft:durability']['max_durability']==2500 and c['minecraft:enchantable']['slot']=='pickaxe'
assert {'minecraft:is_pickaxe','minecraft:netherite_tier'}<=set(c['minecraft:tags']['tags'])
speeds=c['minecraft:digger']['destroy_speeds'];assert {x['block'] for x in speeds if isinstance(x['block'],str)}=={f'hakkai:ore_{i}' for i in range(20)}
for i in range(20):assert (bp/f'blocks/ore_{i}.json').exists()
r=json.loads((bp/'recipes/ult_pickaxe.json').read_text())['minecraft:recipe_shapeless'];assert {x['item'] for x in r['ingredients']}=={'minecraft:netherite_pickaxe','hakkai:warden_core','hakkai:crystal_7','hakkai:shard_9'}
assert r['result']['item']=='hakkai:ult_pickaxe';atlas=json.loads((rp/'textures/item_texture.json').read_text());assert atlas['texture_data']['hakkai_ult_pickaxe']['textures']=='textures/items/hakkai_ult_pickaxe'
assert Image.open(rp/'textures/items/hakkai_ult_pickaxe.png').size==(128,128)
for lang in ('ja_JP','en_US'):assert 'item.hakkai:ult_pickaxe.name=' in (rp/f'texts/{lang}.lang').read_text()
print('ultimate pickaxe recipe, tags, speed definitions, icon and names checked (static only)')
