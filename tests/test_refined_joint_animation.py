"""Newly separated foe joints: track bindings and phase endpoints only."""
import json,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from mob_attack_joint_details import REFINED_JOINTS,add_refined_joints
rp=root/'Hakkai_v7.1.0/ResourcePack'
files={0:'grassland',1:'forest',2:'desert',3:'ice',4:'storm',5:'underworld',6:'sky',7:'clockwork'}
count=walks=0
for (realm,index),names in REFINED_JOINTS.items():
 name=f'foe_{realm}_{index}';prefix=f'f{realm}_{index}_'
 a=json.loads((rp/f'animations/{files[realm]}_foe_individual.animation.json').read_text())['animations']
 m=json.loads((rp/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0]
 bones={b['name']:b for b in m['bones']}
 for n in names.split():
  full=prefix+n;assert full in bones and bones[full].get('parent') in bones
  w=a[f'animation.hakkai.{name}_windup']['bones'][full]['rotation']
  s=a[f'animation.hakkai.{name}_strike']['bones'][full]['rotation']
  c=a[f'animation.hakkai.{name}_contact']['bones'][full]['rotation']
  assert w['0.0']==[0,0,0] and w['1.9']==s['0.0']
  assert c['0.0']==[0,0,0] and c['0.12']==s['0.12'] and c['0.38']==s['0.38']==[0,0,0]
  assert any(w['1.9']) and max(map(abs,w['1.9']))<=5
  if n.startswith(('foot_','hock_','pad_','paw_','talon_')):
   assert full in a[f'animation.hakkai.{name}_walk']['bones'];walks+=1
  count+=1
assert len(REFINED_JOINTS)==26 and count==57 and walks==44,(len(REFINED_JOINTS),count,walks)
for realm,label in ((2,'desert'),(7,'clockwork')):
 a=json.loads((rp/f'animations/{label}_wild_individual.animation.json').read_text())['animations']
 walk=a[f'animation.hakkai.wild_{realm}_0_walk']['bones']
 for i in (2,3):assert f'w{realm}_0_hock_{i}' in walk
try:add_refined_joints({'walk':{'bones':{}},'windup':{'bones':{}},'strike':{'bones':{}}},set(),'f1_3_',1,3)
except ValueError:pass
else:raise AssertionError('missing joint must fail generation')
print(f'{len(REFINED_JOINTS)} foe rigs: {count} new attack joints, {walks} walk joints and neutral contact verified (static only)')
