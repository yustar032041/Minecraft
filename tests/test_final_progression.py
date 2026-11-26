"""Static audit of the intended progression, not proof of in-game access."""
import json
from pathlib import Path
bp=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/BehaviorPack'
def read(path):return json.loads((bp/path).read_text(encoding='utf8'))
for i in range(8):
 assert 'minecraft:loot' not in read(f'entities/ender_{i}.json')['minecraft:entity']['components']
 assert read(f'items/pearl_{i}.json')['minecraft:item']['description']['identifier']==f'hakkai:pearl_{i}'
assert 'minecraft:loot' not in read('entities/fushi_chief.json')['minecraft:entity']['components']
assert 'minecraft:loot' not in read('entities/time_warden.json')['minecraft:entity']['components']
rewards=(bp/'scripts/boss_rewards.js').read_text()
assert "`hakkai:pearl_${i}`,1" in rewards and "'hakkai:fushi_totem',1" in rewards
assert "'hakkai:warden_core',1" in rewards and "'hakkai:crystal_7',4" in rewards
recipe=read('recipes/warden_sigil.json')['minecraft:recipe_shapeless'];items=[x['item'] for x in recipe['ingredients']]
assert len(items)==9 and set(items)=={*(f'hakkai:pearl_{i}' for i in range(8)),'hakkai:fushi_totem'}
assert recipe['result']['item']=='hakkai:warden_sigil' and 'crafting_table' in recipe['tags']
for part in ['sword','axe','pickaxe','helmet','chest','leggings','boots']:
 r=read(f'recipes/ult_{part}.json')['minecraft:recipe_shapeless']
 assert r['result']['item']==f'hakkai:ult_{part}'
 assert {'hakkai:warden_core','hakkai:crystal_7','hakkai:shard_9'}<={x['item'] for x in r['ingredients']}
print('Progression chain: 8 pearls and totem → sigil → individual warden reward → 7 final tools/armor recipes (static only)')
