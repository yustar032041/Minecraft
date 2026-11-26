"""15 inspected humanoid collision prototypes; no runtime or hit validation."""
import json
from pathlib import Path
bp=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/BehaviorPack/entities'
boxes={'foe_1_2':(.80,1.17),'foe_2_2':(.72,1.12),'foe_2_11':(.78,1.13),
 'foe_3_2':(.78,1.16),'foe_4_0':(.84,1.23),'foe_4_2':(.84,1.13),
 'foe_4_8':(.78,1.16),'foe_5_2':(.82,1.13),'foe_6_2':(.80,1.15),
 'foe_6_10':(.82,1.14),'foe_7_2':(.82,1.14),'wild_0_2':(.80,1.16),
 'wild_2_2':(.78,1.19),'wild_4_2':(.80,1.19),'wild_7_2':(.78,1.19)}
for name,(w,h) in boxes.items():
 e=json.loads((bp/f'{name}.json').read_text())['minecraft:entity'];c=e['components']
 assert c['minecraft:collision_box']=={'width':w,'height':h},name
 assert all('minecraft:collision_box' not in g for g in e.get('component_groups',{}).values()),name
 assert all(k in c for k in ('minecraft:physics','minecraft:navigation.walk','minecraft:movement.basic','minecraft:behavior.melee_attack','minecraft:behavior.nearest_attackable_target')),name
 assert 'minecraft:can_fly' not in c and 'hakkai_wildlife' in c['minecraft:type_family']['family'],name
print('15 humanoid collision prototypes: AI and component-group structure checked (static only)')
