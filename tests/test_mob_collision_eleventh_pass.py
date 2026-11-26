"""Grassland deer, hunter and crystal: static check, not runtime hit tests."""
import json
from pathlib import Path
bp=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/BehaviorPack/entities'
boxes={'foe_0_0':(.53,.84),'foe_0_4':(.53,.65),'foe_0_6':(.78,.55),'wild_0_0':(.53,1.0)}
for name,(w,h) in boxes.items():
 e=json.loads((bp/f'{name}.json').read_text())['minecraft:entity'];c=e['components']
 assert c['minecraft:collision_box']=={'width':w,'height':h},name
 assert all('minecraft:collision_box' not in g for g in e.get('component_groups',{}).values()),name
 assert all(k in c for k in ('minecraft:physics','minecraft:navigation.walk','minecraft:movement.basic')),name
 assert 'minecraft:can_fly' not in c and 'hakkai_wildlife' in c['minecraft:type_family']['family'],name
 assert ('minecraft:behavior.avoid_mob_type' in c)==(name=='wild_0_0'),name
 assert ('minecraft:behavior.melee_attack' in c)!=(name=='wild_0_0'),name
print('4 grassland collision prototypes: passive status and AI structure checked (static only)')
