"""Approximate numeric samples only: no Bedrock blending/interpolation proof."""
import json,math,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from preview_mob_pose import sample,posed
from preview_mob_geometry import collect
rp=root/'Hakkai_v7.1.0/ResourcePack'
assert sample({'0.0':[0,0,0],'1.0':[10,-4,2]},.5)==[5,-2,1]
assert sample({'0.0':[0,0,0],'1.0':[10,-4,2]},2)==[10,-4,2]
assert sample(['query.anim_time',0,0],0) is None
assert sample({},0) is None
try:posed({'bones':[]},{'bones':{'missing':{'rotation':[0,0,0]}}},0)
except ValueError:pass
else:raise AssertionError('missing joint accepted')
files=('grassland','forest','desert','ice','storm','underworld','sky','clockwork')
count=0
for realm,f in enumerate(files):
 animations=json.loads((rp/f'animations/{f}_foe_individual.animation.json').read_text())['animations']
 for index in range(12):
  name=f'foe_{realm}_{index}';model=json.loads((rp/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0]
  for phase,t in [('windup',1.9),('strike',.12)]:
   animation=animations[f'animation.hakkai.{name}_{phase}']
   vertices=[v for quad,_ in collect(posed(model,animation,t)) for v in quad]
   assert vertices and all(math.isfinite(x) and abs(x)<256 for v in vertices for x in v),(name,phase)
   count+=1
assert count==192
print('192 approximate attack pose samples are finite and reference existing bones (not Bedrock)')
