import json
from pathlib import Path
r=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=r/'BehaviorPack';rp=r/'ResourcePack'
totem=json.loads((bp/'items/fushi_totem.json').read_text())['minecraft:item']['components']
assert totem['minecraft:allow_off_hand'] is True and totem['hakkai:use']=={}
item=json.loads((bp/'items/resolve_charm.json').read_text())['minecraft:item']
assert item['description']['identifier']=='hakkai:resolve_charm' and item['components']['minecraft:icon']=='hakkai_resolve_charm'
recipe=json.loads((bp/'recipes/resolve_charm.json').read_text())['minecraft:recipe_shapeless']
assert {i['item'] for i in recipe['ingredients']}=={'minecraft:amethyst_shard','hakkai:crystal_0','hakkai:crystal_7'}
assert recipe['result']['item']=='hakkai:resolve_charm'
source=(bp/'scripts/main.js').read_text()
for x in ['fushiTotem?.before(e)','fushiTotem?.isReplaying(victim)','combatUltimate?.cast(p,s)','combatUltimate?.blocks(victim,e.damageSource','combatUltimate?.active(p,system.currentTick)','combatUltimate?.invalidate(player.id)']:
 assert x in source,x
print('Totem, ultimate, recipe, icon and script wiring OK (static only)')
