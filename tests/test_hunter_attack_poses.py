"""Static attack pose continuity and actual rig references; not engine render."""
import json,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];rp=root/'Hakkai_v7.1.0/ResourcePack'
for name,file in [('foe_0_4','grassland'),('foe_1_4','forest'),('foe_5_4','underworld')]:
 model=json.loads((rp/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0]
 bones={b['name'] for b in model['bones']}
 animations=json.loads((rp/f'animations/{file}_foe_individual.animation.json').read_text())['animations']
 wind=animations[f'animation.hakkai.{name}_windup'];strike=animations[f'animation.hakkai.{name}_strike']
 assert (wind['animation_length'],strike['animation_length'])==(1.9,.38)
 assert set(wind['bones'])<=bones and set(strike['bones'])<=bones
 prefix='f'+name.removeprefix('foe_')+'_'
 assert wind['bones'][prefix+'body']['rotation']['1.9']==[-18,0,0]
 for bone in set(wind['bones'])&set(strike['bones']):
  a=wind['bones'][bone].get('rotation');b=strike['bones'][bone].get('rotation')
  if isinstance(a,dict) and isinstance(b,dict) and '1.9' in a and '0.0' in b:
   assert a['1.9']==b['0.0'],(name,bone)
print('3 shadow-hunter attack poses use individual bones and join at keyframes; engine blending untested')
for generator in ['sync_grassland_foe_visuals.py','sync_forest_foe_individual_visuals.py','sync_underworld_foe_visuals.py']:
 subprocess.run([sys.executable,str(root/'tools'/generator),'--check'],cwd=root,check=True)
