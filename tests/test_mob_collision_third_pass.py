"""Hand-selected provisional hitboxes. Not a Bedrock hit or passage test."""
import json
from pathlib import Path
bp=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/BehaviorPack/entities'
boxes={'foe_1_5':(.53,.70),'foe_1_6':(.84,.54),'foe_1_11':(.84,.55),
       'foe_2_6':(.86,.54),'foe_3_6':(.86,.57),'foe_4_6':(.86,.56),
       'foe_6_6':(.88,.55),'foe_7_6':(.88,.58)}
for name,(w,h) in boxes.items():
 e=json.loads((bp/f'{name}.json').read_text())['minecraft:entity'];c=e['components']
 assert c['minecraft:collision_box']=={'width':w,'height':h},name
 assert 'minecraft:physics' in c and 'minecraft:navigation.walk' in c and 'minecraft:can_fly' not in c,name
 assert 'hakkai_wildlife' in c['minecraft:type_family']['family'],name
 assert 'minecraft:behavior.melee_attack' in c and 'minecraft:movement.basic' in c,name
 # No conditionally overridden collision box undermines this review.
 assert all('minecraft:collision_box' not in group for group in e.get('component_groups',{}).values()),name
print('8 additional individually reviewed collision prototypes; Bedrock passage and hit tests still required')
