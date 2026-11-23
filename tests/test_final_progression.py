"""Static audit of the intended progression, not proof of in-game access."""
import json
from pathlib import Path
bp=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/BehaviorPack'
def read(path):return json.loads((bp/path).read_text(encoding='utf8'))
def loot(entity):
 e=read(f'entities/{entity}.json')['minecraft:entity'];table=read(e['components']['minecraft:loot']['table'])
 return [x['name'] for p in table['pools'] for x in p.get('entries',[]) if x.get('type')=='item']
for i in range(8):
 assert f'hakkai:pearl_{i}' in loot(f'ender_{i}')
 assert read(f'items/pearl_{i}.json')['minecraft:item']['description']['identifier']==f'hakkai:pearl_{i}'
assert 'hakkai:fushi_totem' in loot('fushi_chief')
assert {'hakkai:warden_core','hakkai:crystal_7'}<=set(loot('time_warden'))
recipe=read('recipes/warden_sigil.json')['minecraft:recipe_shapeless'];items=[x['item'] for x in recipe['ingredients']]
assert len(items)==9 and set(items)=={*(f'hakkai:pearl_{i}' for i in range(8)),'hakkai:fushi_totem'}
assert recipe['result']['item']=='hakkai:warden_sigil' and 'crafting_table' in recipe['tags']
for part in ['sword','axe','pickaxe','helmet','chest','leggings','boots']:
 r=read(f'recipes/ult_{part}.json')['minecraft:recipe_shapeless']
 assert r['result']['item']==f'hakkai:ult_{part}'
 assert {'hakkai:warden_core','hakkai:crystal_7','hakkai:shard_9'}<={x['item'] for x in r['ingredients']}
print('Progression chain: 8 pearls and totem → sigil → warden loot → 7 final tools/armor recipes (static only)')
