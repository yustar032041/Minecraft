"""Static encounter asset and progression checks, not a Bedrock import test."""
import json, struct
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=root/'BehaviorPack';rp=root/'ResourcePack'
def load(path):return json.loads(path.read_text(encoding='utf8'))
def dims(path):
 data=path.read_bytes();assert data[:8]==b'\x89PNG\r\n\x1a\n';return struct.unpack('>II',data[16:24])
atlas=load(rp/'textures/item_texture.json')['texture_data']
for i in range(8):
 name=f'ender_{i}';entity=load(bp/f'entities/{name}.json')['minecraft:entity']
 assert entity['description']['identifier']==f'hakkai:{name}'
 comp=entity['components'];assert comp['minecraft:knockback_resistance']['value']==.5
 assert 'minecraft:behavior.hurt_by_target' in comp and 'minecraft:behavior.nearest_attackable_target' not in comp
 assert 'monster' not in comp['minecraft:type_family']['family']
 assert 'minecraft:loot' not in comp
 assert "`hakkai:pearl_${i}`,1" in (bp/'scripts/boss_rewards.js').read_text()
 item=load(bp/f'items/pearl_{i}.json')['minecraft:item'];assert item['description']['identifier']==f'hakkai:pearl_{i}'
 assert 'hakkai:use' in item['components'] and atlas[f'hakkai_pearl_{i}']['textures']==f'textures/items/hakkai_pearl_{i}'
 client=load(rp/f'entity/{name}.entity.json')['minecraft:client_entity']['description']
 assert client['identifier']==f'hakkai:{name}' and client['geometry']['default']==f'geometry.hakkai.ender_{i}'
 for suffix in ('','_n','_mer'):assert dims(rp/f'textures/entity/hakkai_ender_r{i}{suffix}.png')==(1024,1024)
assert load(rp/'models/entity/realm_ender.geo.json')['minecraft:geometry'][0]['description']['identifier']=='geometry.hakkai.realm_ender'
for name in ('fushi','fushi_chief'):
 ent=load(bp/f'entities/{name}.json')['minecraft:entity'];comp=ent['components']
 assert ent['description']['identifier']==f'hakkai:{name}'
 assert 'minecraft:behavior.nearest_attackable_target' not in comp
 assert load(rp/f'entity/{name}.entity.json')['minecraft:client_entity']['description']['geometry']['default']==f'geometry.hakkai.{name}'
 for suffix in ('','_n','_mer'):assert dims(rp/f'textures/entity/hakkai_{name}{suffix}.png')==(512,512)
 if name=='fushi':
  assert 'minecraft:loot' not in comp
  assert comp['minecraft:behavior.tempt']['items']==['minecraft:bamboo']
  assert comp['minecraft:behavior.tempt']['priority']<comp['minecraft:behavior.random_stroll']['priority']
 else:
  assert comp['minecraft:health']['value']==comp['minecraft:health']['max']==1000 and comp['minecraft:knockback_resistance']['value']==1
  assert 'minecraft:boss' in comp and comp['minecraft:pushable']['is_pushable'] is False
  assert 'minecraft:loot' not in comp
  assert "'hakkai:crystal_7',2" in (bp/'scripts/boss_rewards.js').read_text()
main=(bp/'scripts/main.js').read_text(encoding='utf8')
for token in ['spawnRealmEnder(p,realmId,t)','spawnFushi(p,t,true)','spawnFushi(p,t,false)','fushiThresholds(grove,isMoonlitNight(world))',"pearl=id.match",'realmEnders?.onHurt','fushiSystem?.onHurt','realmEnders?.tick','fushiSystem?.tick']:
 assert token in main,token
assert (bp/'items/fushi_totem.json').exists()
assert 'item.hakkai:fushi_totem.name=FUSHIのトーテム' in (rp/'texts/ja_JP.lang').read_text(encoding='utf8')
print('8 enderman → pearl → return definitions and FUSHI/chief assets and hooks OK (static only)')
