"""Asset linkage and friendly-vs-guard checks; not a Bedrock visual/AI test."""
import json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=root/'BehaviorPack';rp=root/'ResourcePack'
read=lambda p:json.loads(p.read_text(encoding='utf8'))
textures=[]
for realm in range(8):
 for role in range(4):
  id=f'resident_{realm}_{role}';ident='hakkai:'+id
  entity=read(bp/f'entities/{id}.json')['minecraft:entity'];c=entity['components'];desc=entity['description']
  client=read(rp/f'entity/{id}.entity.json')['minecraft:client_entity']['description']
  assert desc['identifier']==client['identifier']==ident and desc['is_spawnable'] and desc['is_summonable']
  assert 'hakkai_resident' in c['minecraft:type_family']['family'] and 'villager' not in c['minecraft:type_family']['family']
  assert 'minecraft:despawn' not in c and 'minecraft:timer' not in c
  assert client['geometry']['default']==f'geometry.hakkai.resident_{role}'
  assert client['textures']['default']==f'textures/entity/{id}'
  texture=rp/f'textures/entity/{id}.png';textures.append(hashlib.sha256(texture.read_bytes()).hexdigest())
  if role==3:
   target=c['minecraft:behavior.nearest_attackable_target']['entity_types'][0]['filters']['all_of']
   assert any(x['value']=='monster' for x in target) and any(x['value']=='creeper' and x['operator']=='!=' for x in target)
   assert 'minecraft:behavior.melee_attack' in c and 'minecraft:behavior.avoid_mob_type' not in c
  else:
   assert c['minecraft:behavior.avoid_mob_type']['entity_types'][0]['filters']['value']=='monster'
   assert 'minecraft:behavior.nearest_attackable_target' not in c and 'minecraft:attack' not in c
  for locale in ['ja_JP','en_US']:
   lang=(rp/f'texts/{locale}.lang').read_text(encoding='utf8')
   assert f'entity.{ident}.name=' in lang and f'item.spawn_egg.entity.{ident}.name=' in lang
assert len(set(textures))==32
for i in range(4):
 geo=read(rp/f'models/entity/resident_{i}.geo.json')['minecraft:geometry'][0]
 assert geo['description']['identifier']==f'geometry.hakkai.resident_{i}'
 assert {'body','head','arm_l','arm_r','leg_0','leg_1'} <= {b['name'] for b in geo['bones']}
print('32 distinct themed textures and client/server entity links; four non-vanilla professions (static only)')
