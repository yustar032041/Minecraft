"""Individual rabbit and humanoid collision prototypes; static, not Bedrock."""
import json
from pathlib import Path
bp=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/BehaviorPack/entities'
boxes={'foe_1_7':(.53,.66),'foe_2_7':(.53,.70),'foe_3_7':(.53,.70),
       'foe_4_7':(.53,.70),'foe_5_7':(.53,.68),'foe_6_7':(.53,.68),
       'foe_7_7':(.53,.68),'foe_3_8':(.76,1.15),'foe_5_10':(.68,1.15)}
for name,(w,h) in boxes.items():
 e=json.loads((bp/f'{name}.json').read_text())['minecraft:entity'];c=e['components']
 assert c['minecraft:collision_box']=={'width':w,'height':h},name
 assert all('minecraft:collision_box' not in g for g in e.get('component_groups',{}).values()),name
 assert all(key in c for key in ('minecraft:physics','minecraft:navigation.walk','minecraft:movement.basic','minecraft:behavior.melee_attack')),name
 assert 'minecraft:can_fly' not in c and 'hakkai_wildlife' in c['minecraft:type_family']['family'],name
 assert c['minecraft:behavior.melee_attack']['track_target'] is True,name
print('7 rabbits and 2 humanoids: provisional collision values (static only)')
