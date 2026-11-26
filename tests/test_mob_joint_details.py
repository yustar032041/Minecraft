"""Selected secondary tracks: binding and phase continuity, not Bedrock."""
import json,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from mob_attack_joint_details import SELECTED,add_details
rp=root/'Hakkai_v7.1.0/ResourcePack'
files=('grassland','forest','desert','ice','storm','underworld','sky','clockwork')
count=0;total=0
for realm,file in enumerate(files):
 data=json.loads((rp/f'animations/{file}_foe_individual.animation.json').read_text())['animations']
 for i in range(12):
  name=f'foe_{realm}_{i}';prefix=f'f{realm}_{i}_'; selected=SELECTED[realm][i].split()
  if selected:count+=1
  wind=data[f'animation.hakkai.{name}_windup'];strike=data[f'animation.hakkai.{name}_strike']
  model=json.loads((rp/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0]
  bones={b['name'] for b in model['bones']}
  for n in selected:
   full=prefix+n;assert full in bones
   w=wind['bones'][full]['rotation'];s=strike['bones'][full]['rotation']
   assert w['1.9']==s['0.0'] and s['0.38']==[0,0,0],(name,n)
   assert all(isinstance(v,(int,float)) and abs(v)<=20 for v in w['1.9']),(name,n)
   total+=1
assert count==91 and total>200,(count,total)
# Five early grassland rigs lack suitable child joints and have their own
# core poses instead. These transitions must also meet at the phase boundary.
a=json.loads((rp/'animations/grassland_foe_individual.animation.json').read_text())['animations']
for i in (1,2,3,6,10):
 for bone in ('body','head'):
  w=a[f'animation.hakkai.foe_0_{i}_windup']['bones'][f'f0_{i}_{bone}']['rotation']
  s=a[f'animation.hakkai.foe_0_{i}_strike']['bones'][f'f0_{i}_{bone}']['rotation']
  assert w['1.9']==s['0.0'] and s['0.38']==[0,0,0]
# Never replace a pre-authored track, or create one when only a single phase
# is already authored. Wrong bone selection must fail rather than silently pass.
a={'windup':{'bones':{'tail':{'rotation':{'1.9':[1,2,3]}}}},'strike':{'bones':{}}}
add_details(a,{'f1_0_tail','f1_0_tail_fan'},'f1_0_',1,0)
assert a['windup']['bones']['tail']['rotation']['1.9']==[1,2,3] and 'tail' not in a['strike']['bones']
try:add_details({'windup':{'bones':{}},'strike':{'bones':{}}},set(),'f1_0_',1,0)
except ValueError:pass
else:raise AssertionError('missing selected joints not rejected')
print(f'{count} foe rigs: {total} selected attack joints, matching phases (static only)')
