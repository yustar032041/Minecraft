"""Static check of client animation/geometry coverage, not a Bedrock rendering test."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0'
rp=root/'ResourcePack'
names=[f'wild_{r}_{v}' for r in range(8) for v in range(3)]+[f'foe_{r}_{v}' for r in range(8) for v in range(12)]+[f'guardian_{r}' for r in range(8)]+[f'ender_{r}' for r in range(8)]+['fushi_chief','eclipse_colossus']
anims=json.loads((rp/'animations/creature_attacks.animation.json').read_text())['animations']
talent_anims=json.loads((rp/'animations/creature_talent_attacks.animation.json').read_text())['animations']
talent_anims.update(json.loads((rp/'animations/creature_anatomy_attacks.animation.json').read_text())['animations'])
assert len(talent_anims)==30
rigs=json.loads((rp/'animations/guardian_individual_rigs.animation.json').read_text())['animations']
anims.update(rigs);talent_anims.update(rigs)
anims.update(json.loads((rp/'animations/realm_traveler_individual.animation.json').read_text())['animations'])
foe_rigs=json.loads((rp/'animations/grassland_foe_individual.animation.json').read_text())['animations']
anims.update(foe_rigs);talent_anims.update(foe_rigs)
forest_rigs=json.loads((rp/'animations/forest_wild_individual.animation.json').read_text())['animations']
anims.update(forest_rigs);talent_anims.update(forest_rigs)
desert_rigs=json.loads((rp/'animations/desert_wild_individual.animation.json').read_text())['animations']
anims.update(desert_rigs);talent_anims.update(desert_rigs)
ice_storm_rigs=json.loads((rp/'animations/ice_storm_wild_individual.animation.json').read_text())['animations']
anims.update(ice_storm_rigs);talent_anims.update(ice_storm_rigs)
underworld_rigs=json.loads((rp/'animations/underworld_wild_individual.animation.json').read_text())['animations']
anims.update(underworld_rigs);talent_anims.update(underworld_rigs)
sky_rigs=json.loads((rp/'animations/sky_wild_individual.animation.json').read_text())['animations']
anims.update(sky_rigs);talent_anims.update(sky_rigs)
clockwork_rigs=json.loads((rp/'animations/clockwork_wild_individual.animation.json').read_text())['animations']
anims.update(clockwork_rigs);talent_anims.update(clockwork_rigs)
grassland_wild_rigs=json.loads((rp/'animations/grassland_wild_individual.animation.json').read_text())['animations']
anims.update(grassland_wild_rigs);talent_anims.update(grassland_wild_rigs)
forest_foe_rigs=json.loads((rp/'animations/forest_foe_individual.animation.json').read_text())['animations']
anims.update(forest_foe_rigs);talent_anims.update(forest_foe_rigs)
desert_foe_rigs=json.loads((rp/'animations/desert_foe_individual.animation.json').read_text())['animations']
anims.update(desert_foe_rigs);talent_anims.update(desert_foe_rigs)
ice_foe_rigs=json.loads((rp/'animations/ice_foe_individual.animation.json').read_text())['animations']
anims.update(ice_foe_rigs);talent_anims.update(ice_foe_rigs)
storm_foe_rigs=json.loads((rp/'animations/storm_foe_individual.animation.json').read_text())['animations']
anims.update(storm_foe_rigs);talent_anims.update(storm_foe_rigs)
underworld_foe_rigs=json.loads((rp/'animations/underworld_foe_individual.animation.json').read_text())['animations']
anims.update(underworld_foe_rigs);talent_anims.update(underworld_foe_rigs)
sky_foe_rigs=json.loads((rp/'animations/sky_foe_individual.animation.json').read_text())['animations']
anims.update(sky_foe_rigs);talent_anims.update(sky_foe_rigs)
clockwork_foe_rigs=json.loads((rp/'animations/clockwork_foe_individual.animation.json').read_text())['animations']
anims.update(clockwork_foe_rigs);talent_anims.update(clockwork_foe_rigs)
count=0
geometry={}
for path in (rp/'models/entity').glob('*.json'):
 for model in json.loads(path.read_text()).get('minecraft:geometry',[]):
  geometry[model['description']['identifier']]={b['name'] for b in model.get('bones',[])}
for name in names:
 desc=json.loads((rp/'entity'/f'{name}.entity.json').read_text())['minecraft:client_entity']['description']
 for short in ['creature_windup','creature_strike']:
  aid=desc['animations'][short];assert aid in anims,(name,aid)
  assert set(anims[aid]['bones'])<=geometry[desc['geometry']['default']],name
 for short in ['talent_windup','talent_strike']:
  aid=desc['animations'].get(short)
  if aid:
   count+=1
   assert aid in talent_anims,(name,aid)
   assert set(talent_anims[aid]['bones'])<=geometry[desc['geometry']['default']],name
   assert talent_anims[aid]['animation_length']==(1.9 if short.endswith('windup') else .38),(name,aid)
assert count==208,count
for realm in range(8):
 desc=json.loads((rp/'entity'/f'guardian_{realm}.entity.json').read_text())['minecraft:client_entity']['description']
 for style in ('brace','lunge','cast'):
  for phase in ('windup','strike'):
   aid=desc['animations'][f'guardian_{style}_{phase}']
   assert aid in talent_anims,(realm,aid)
   assert set(talent_anims[aid]['bones'])<=geometry[desc['geometry']['default']],(realm,aid)

print(f'Creature attack animation references and bones OK: {len(names)} clients')
