"""Second set of individually chosen provisional collision values."""
import json
from pathlib import Path
bp=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/BehaviorPack/entities'
boxes={'foe_0_7':(.53,.72),'foe_2_4':(.53,.45),'foe_3_1':(.53,.72),
       'foe_4_9':(.53,.74),'foe_5_3':(.66,.64),'foe_5_5':(.53,.72),
       'foe_5_11':(.53,.72),'foe_6_1':(.53,.74),'foe_7_3':(.64,.64),
       'wild_2_1':(.64,.46),'wild_6_1':(.53,.8)}
for name,(w,h) in boxes.items():
 c=json.loads((bp/f'{name}.json').read_text())['minecraft:entity']['components']
 assert c['minecraft:collision_box']=={'width':w,'height':h}
 assert 'minecraft:physics' in c and 'minecraft:navigation.walk' in c and 'minecraft:can_fly' not in c
 assert 'hakkai_wildlife' in c['minecraft:type_family']['family']
assert len(boxes)==11
print('11 additional hand-selected collision prototypes: static checks OK')
