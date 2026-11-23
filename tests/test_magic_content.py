"""Static magic items, crafting, names and documentation wiring; not Bedrock execution."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=root/'BehaviorPack';rp=root/'ResourcePack'
for name,crystals in {'magic_hikari':[5],'magic_kaze':[0],'magic_mizu':[1],'magic_homura':[2],'magic_kizuna':[0,1]}.items():
 item=json.loads((bp/'items'/f'{name}.json').read_text())['minecraft:item']
 assert item['description']['identifier']==f'hakkai:{name}'
 assert item['components']['hakkai:use']=={} and item['components']['minecraft:max_stack_size']==1
 assert item['components']['minecraft:icon']==f'hakkai_{name}'
 recipe=json.loads((bp/'recipes'/f'{name}.json').read_text())['minecraft:recipe_shapeless']
 assert recipe['result']['item']==f'hakkai:{name}'
 assert [x['item'] for x in recipe['ingredients']]==['minecraft:book']+[f'hakkai:crystal_{i}' for i in crystals]
 for lang in ('ja_JP','en_US'):
  assert f'item.hakkai:{name}.name=' in (rp/'texts'/f'{lang}.lang').read_text()
assert 'hakkai:use' in json.loads((bp/'items/fushi_totem.json').read_text())['minecraft:item']['components']
main=(bp/'scripts/main.js').read_text()
for token in ('totemMagicMenu','castMagic(p,\'moon\')','staggerTarget(enemy','magicItems','月のまどろみ'):
 assert token in main,token
print('Five magic items and recipes, totem and spell wiring OK (static only)')
