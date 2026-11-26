"""Static checks and approximate samples, not a Bedrock render or blend test."""
import json,math,subprocess,sys,tempfile
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from preview_mob_pose import posed
from preview_mob_geometry import collect
rp=root/'Hakkai_v7.1.0/ResourcePack'
gestures=set()
rig=json.loads((rp/'animations/realm_traveler_individual.animation.json').read_text())['animations']
for i in range(8):
 model=json.loads((rp/f'models/entity/ender_{i}.geo.json').read_text())['minecraft:geometry'][0]
 bones={b['name']:b for b in model['bones']}
 wind=rig[f'animation.hakkai.ender_{i}_windup'];strike=rig[f'animation.hakkai.ender_{i}_strike']
 assert (wind['animation_length'],strike['animation_length'])==(1.9,.38)
 assert set(wind['bones'])<=bones.keys() and set(strike['bones'])<=bones.keys()
 for bone in set(wind['bones'])&set(strike['bones']):
  a=wind['bones'][bone]['rotation'];b=strike['bones'][bone]['rotation'];assert a['1.9']==b['0.0']
 for side in ('right','left'):
  upper=f'e{i}_{side}_arm';a=wind['bones'][upper]['rotation'];b=strike['bones'][upper]['rotation']
  assert a['0.0']==[0,0,0] and a['1.9']==b['0.0'] and b['0.38']==[0,0,0]
  bone=f'e{i}_{side}_arm_lower';assert bones[bone]['parent']==f'e{i}_{side}_arm'
  a=wind['bones'][bone]['rotation'];b=strike['bones'][bone]['rotation']
  assert a['1.9']==b['0.0']==[-6,0,0] and b['0.38']==[0,0,0]
 gestures.add(tuple(tuple(wind['bones'][f'e{i}_{side}_arm']['rotation']['1.9']) for side in ('right','left')))
 for anim,t in ((wind,1.9),(strike,.12)):
  vertices=[v for quad,_ in collect(posed(model,anim,t)) for v in quad]
  assert vertices and all(math.isfinite(x) and abs(x)<256 for v in vertices for x in v),(i,t)
assert len(gestures)==8
subprocess.run([sys.executable,str(root/'tools/sync_realm_traveler_visuals.py'),'--check'],cwd=root,check=True)
with tempfile.TemporaryDirectory() as tmp:
 out=Path(tmp)/'pose.png'
 subprocess.run([sys.executable,str(root/'tools/preview_mob_pose.py'),'ender_0',str(rp/'animations/realm_traveler_individual.animation.json'),'animation.hakkai.ender_0_strike','.12','--texture',str(rp/'textures/entity/hakkai_ender_r0.png'),'--panel','64','--output',str(out)],cwd=root,check=True)
 assert out.is_file()
print('8 travelers: 16 finite pose samples, 32 forearm tracks and aligned rotation keys (static only)')
