"""Reviewed bird and wild creatures: static only, not a Bedrock hitbox test."""
import json
from pathlib import Path
bp=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/BehaviorPack/entities'
boxes={'foe_3_9':(.58,.74),'wild_1_1':(.55,.52),'wild_1_2':(.62,.80),
       'wild_3_2':(.62,.78),'wild_5_0':(.62,.52),'wild_5_1':(.66,.56),
       'wild_5_2':(.82,.54),'wild_6_2':(.62,.78)}
for name,(w,h) in boxes.items():
 e=json.loads((bp/f'{name}.json').read_text())['minecraft:entity'];c=e['components']
 assert c['minecraft:collision_box']=={'width':w,'height':h},name
 assert 'minecraft:physics' in c and 'minecraft:navigation.walk' in c and 'minecraft:movement.basic' in c,name
 assert 'minecraft:can_fly' not in c and 'hakkai_wildlife' in c['minecraft:type_family']['family'],name
 assert all('minecraft:collision_box' not in group for group in e.get('component_groups',{}).values()),name
 assert ('minecraft:behavior.melee_attack' in c)==(name!='wild_5_0'),name
print('8 hand-reviewed bird/wild creature collision prototypes; gameplay and Bedrock verification still required')
