"""Hand-reviewed shells, small creatures and soldiers; not Bedrock collision tests."""
import json
from pathlib import Path
bp=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/BehaviorPack/entities'
boxes={'foe_0_3':(.64,.64),'foe_1_3':(.64,.60),'foe_2_3':(.66,.60),
       'foe_3_3':(.64,.56),'foe_4_3':(.66,.60),'foe_6_3':(.64,.60),
       'foe_2_8':(.70,.66),'foe_5_8':(.66,.60),'foe_2_1':(.53,.68),
       'foe_4_1':(.53,.68),'foe_1_8':(.72,1.08),'foe_7_8':(.68,1.04)}
# This pass changes only boxes, not the existing movement or contact attacks.
movement={'foe_0_3':(.24,1,4),'foe_1_3':(.26,1.12,4),'foe_2_3':(.28,1.12,4),
          'foe_3_3':(.30,1.12,5),'foe_4_3':(.18,1,5),'foe_6_3':(.22,1,6),
          'foe_2_8':(.20,1,4),'foe_5_8':(.20,1,5),'foe_2_1':(.30,1.12,4),
          'foe_4_1':(.27,1.12,4),'foe_1_8':(.28,1.12,4),'foe_7_8':(.28,1.12,6)}
for name,(w,h) in boxes.items():
 e=json.loads((bp/f'{name}.json').read_text())['minecraft:entity'];c=e['components']
 assert c['minecraft:collision_box']=={'width':w,'height':h},name
 assert all('minecraft:collision_box' not in g for g in e.get('component_groups',{}).values()),name
 assert 'minecraft:physics' in c and 'minecraft:navigation.walk' in c and 'minecraft:movement.basic' in c,name
 assert 'minecraft:can_fly' not in c and 'minecraft:behavior.melee_attack' in c,name
 speed,multiplier,damage=movement[name]
 assert c['minecraft:movement']['value']==speed,name
 assert c['minecraft:behavior.melee_attack']['speed_multiplier']==multiplier,name
 assert c['minecraft:behavior.melee_attack']['track_target'] is True and c['minecraft:attack']['damage']==damage,name
 assert 'hakkai_wildlife' in c['minecraft:type_family']['family'],name
print('12 hand-reviewed collision prototypes; gameplay and Bedrock validation still required')
