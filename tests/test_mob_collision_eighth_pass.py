"""12 individually reviewed collision prototypes, not Bedrock hit tests."""
import json
from pathlib import Path
bp=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/BehaviorPack/entities'
boxes={'wild_0_1':(.53,.66),'wild_2_0':(.53,.72),'wild_3_0':(.53,.68),
       'wild_7_0':(.53,.72),'wild_7_1':(.53,.68),'foe_0_5':(.53,.68),
       'foe_0_11':(.53,.69),'foe_1_9':(.53,.66),'foe_3_5':(.53,.72),
       'foe_6_9':(.53,.66),'foe_6_0':(.53,.70),'foe_4_11':(.53,.72)}
for name,(w,h) in boxes.items():
 e=json.loads((bp/f'{name}.json').read_text())['minecraft:entity'];c=e['components']
 assert c['minecraft:collision_box']=={'width':w,'height':h},name
 assert all('minecraft:collision_box' not in g for g in e.get('component_groups',{}).values()),name
 assert all(k in c for k in ('minecraft:physics','minecraft:navigation.walk','minecraft:movement.basic')),name
 assert 'minecraft:can_fly' not in c and 'hakkai_wildlife' in c['minecraft:type_family']['family'],name
 is_passive=name in ('wild_2_0','wild_3_0','wild_7_0')
 assert ('minecraft:behavior.avoid_mob_type' in c)==is_passive,name
 assert ('minecraft:behavior.melee_attack' in c)!=is_passive,name
print('12 wildlife/bird/winged creature collision prototypes; game and flight behavior unchanged (static only)')
