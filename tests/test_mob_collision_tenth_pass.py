"""Reviewed beasts, birds, spiders and deer: static checks, not Bedrock hit tests."""
import json
from pathlib import Path
bp=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/BehaviorPack/entities'
boxes={'foe_1_0':(.53,.64),'foe_2_9':(.53,.68),'foe_2_10':(.53,.68),
 'foe_3_11':(.68,.53),'foe_5_0':(.53,.56),'foe_5_1':(.76,.55),
 'foe_5_9':(.76,.55),'foe_6_4':(.53,.68),'foe_6_11':(.53,.56),
 'wild_3_1':(.53,1.0),'wild_4_1':(.53,1.0),'wild_4_0':(.53,.67)}
for name,(w,h) in boxes.items():
 e=json.loads((bp/f'{name}.json').read_text())['minecraft:entity'];c=e['components']
 assert c['minecraft:collision_box']=={'width':w,'height':h},name
 assert all('minecraft:collision_box' not in g for g in e.get('component_groups',{}).values()),name
 assert all(k in c for k in ('minecraft:physics','minecraft:navigation.walk','minecraft:movement.basic')),name
 assert 'minecraft:can_fly' not in c and 'hakkai_wildlife' in c['minecraft:type_family']['family'],name
 assert ('minecraft:behavior.avoid_mob_type' in c)==(name=='wild_4_0'),name
 assert ('minecraft:behavior.melee_attack' in c)!=(name=='wild_4_0'),name
print('12 beast/bird/spider/deer collision prototypes: AI structure checked (static only)')
