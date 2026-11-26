"""Static asset and action wiring checks; real Bedrock animation remains untested."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0'
rp=root/'ResourcePack'; bp=root/'BehaviorPack'
anims=json.loads((rp/'animations/patrol_attacks.animation.json').read_text())['animations']
for name,shorts in {'village_watch':['patrol_strike'],'village_mage':['patrol_strike','patrol_cast'],'village_archer':['patrol_shot']}.items():
 desc=json.loads((rp/'entity'/f'{name}.entity.json').read_text())['minecraft:client_entity']['description']
 model=json.loads((rp/'models/entity'/f'{name}.geo.json').read_text())['minecraft:geometry'][0]
 assert desc['geometry']['default']==model['description']['identifier']
 bones={b['name'] for b in model['bones']}
 for short in shorts:
  aid=desc['animations'][short];assert aid in anims and set(anims[aid]['bones'])<=bones,(name,short)
 archer=(name=='village_archer')
 if archer:
  assert {'patrol_shot':'variable.attack_time > 0.0'} in desc['scripts']['animate']
  assert anims[desc['animations']['patrol_shot']]['loop'] is True
p=json.loads((bp/'entities/village_archer.json').read_text())['minecraft:entity']['components']['minecraft:behavior.ranged_attack']
assert p['swing'] is True and (p['attack_interval_min'],p['attack_interval_max'],p['attack_radius'])==(1.7,3,13)
print('Patrol animation references, bones and ranged swing configuration OK (static only)')
