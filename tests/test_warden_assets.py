"""Check the prototype's complete material path and pack references (not game behavior)."""
import json,struct
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=root/'BehaviorPack';rp=root/'ResourcePack'
def load(path):return json.loads(path.read_text(encoding='utf8'))
def dim(path):return struct.unpack('>II',path.read_bytes()[16:24])
recipe=load(bp/'recipes/warden_sigil.json')['minecraft:recipe_shapeless']
assert {x['item'] for x in recipe['ingredients']}=={*(f'hakkai:pearl_{i}' for i in range(8)),'hakkai:fushi_totem'}
assert len(recipe['ingredients'])==9 and recipe['result']['item']=='hakkai:warden_sigil'
for item in ['fushi_totem','warden_sigil','warden_core']:
 ent=load(bp/f'items/{item}.json')['minecraft:item'];assert ent['description']['identifier']==f'hakkai:{item}'
 assert ent['components']['minecraft:icon']==f'hakkai_{item}'
loot=load(bp/'loot_tables/hakkai/entities/fushi_chief.json')
assert {e['name'] for pool in loot['pools'] for e in pool['entries']}=={'hakkai:fushi_totem','hakkai:crystal_7'}
dimension=load(bp/'dimensions/warden_arena.json')['minecraft:dimension']
assert dimension['description']['identifier']=='hakkai:warden_arena'
assert dimension['components']['minecraft:generation']['generator_type']=='void'
entity=load(bp/'entities/time_warden.json')['minecraft:entity'];c=entity['components']
assert entity['description']['identifier']=='hakkai:time_warden' and c['minecraft:health']['max']==5000
assert c['minecraft:boss']['name']=='時空の管理者' and c['minecraft:knockback_resistance']['value']==1
assert c['minecraft:pushable']['is_pushable'] is False and 'minecraft:persistent' in c
assert 'minecraft:behavior.melee_attack' not in c, 'attacks must use the warning system'
loot=load(bp/c['minecraft:loot']['table']);drops={e['name'] for pool in loot['pools'] for e in pool['entries']}
assert drops=={'hakkai:warden_core','hakkai:crystal_7'}
trade=load(bp/'recipes/warden_core_exchange.json')['minecraft:recipe_shapeless']
assert trade['ingredients'][0]['item']=='hakkai:warden_core' and trade['result']=={'item':'hakkai:shard_9','count':8}
client=load(rp/'entity/time_warden.entity.json')['minecraft:client_entity']['description']
assert client['identifier']=='hakkai:time_warden' and client['geometry']['default']=='geometry.hakkai.time_warden'
assert client['animations']['warning']=='animation.hakkai.warden_warning'
assert 'animation.hakkai.warden_warning' in load(rp/'animations/time_warden.animation.json')['animations']
assert load(rp/'models/entity/time_warden.geo.json')['minecraft:geometry'][0]['description']['identifier']=='geometry.hakkai.time_warden'
for suffix in ('','_n','_mer'):assert dim(rp/f'textures/entity/hakkai_time_warden{suffix}.png')==(512,512)
main=(bp/'scripts/main.js').read_text(encoding='utf8')
for hook in ['wardenArena?.open(p)','wardenBoss?.tick(p,t)','wardenBoss?.onDeath(e)','wardenBoss?.onMeleeParry({damagingEntity:p,hitEntity})','fushi_totem_at']:
 assert hook in main,hook
assert 'item.hakkai:fushi_totem.name=FUSHIのトーテム' in (rp/'texts/ja_JP.lang').read_text(encoding='utf8')
print('Prototype warden assets: 8 pearls + totem → sigil → arena boss → core → shards OK (static only)')
