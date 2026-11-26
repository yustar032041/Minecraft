"""Selected foxes and village archer: provisional, static checks only."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1];bp=root/'Hakkai_v7.1.0/BehaviorPack/entities'
for name,width,height in [('foe_1_4',.53,.70),('foe_3_4',.53,.68),('foe_5_4',.53,.68),('foe_7_4',.53,.70),('village_archer',.69,1.04)]:
 e=json.loads((bp/f'{name}.json').read_text())['minecraft:entity'];c=e['components']
 assert c['minecraft:collision_box']=={'width':width,'height':height},name
 assert all('minecraft:collision_box' not in g for g in e.get('component_groups',{}).values()),name
 assert 'minecraft:physics' in c and 'minecraft:navigation.walk' in c and 'minecraft:movement.basic' in c,name
 if name=='village_archer':
  assert c['minecraft:shooter']['def']=='minecraft:arrow' and c['minecraft:behavior.ranged_attack']['swing'] is True
 else:assert 'minecraft:behavior.melee_attack' in c and 'hakkai_wildlife' in c['minecraft:type_family']['family']
print('4 foxes and village archer provisional boxes verified (static only)')
