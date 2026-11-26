"""Guardian pose sampling/continuity is approximate; not Bedrock rendering."""
import json,math,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from preview_mob_pose import posed
from preview_mob_geometry import collect
rp=root/'Hakkai_v7.1.0/ResourcePack'
rig=json.loads((rp/'animations/guardian_individual_rigs.animation.json').read_text())['animations']
count=0
for i in range(8):
 model=json.loads((rp/f'models/entity/guardian_{i}.geo.json').read_text())['minecraft:geometry'][0]
 skeleton={b['name']:b for b in model['bones']}
 for style in ('brace','lunge','cast'):
  wind=rig[f'animation.hakkai.guardian_{i}_{style}_windup'];strike=rig[f'animation.hakkai.guardian_{i}_{style}_strike']
  assert (wind['animation_length'],strike['animation_length'])==(1.9,.38)
  assert set(wind['bones'])<=set(skeleton) and set(strike['bones'])<=set(skeleton)
  for bone in set(wind['bones'])&set(strike['bones']):
   a=wind['bones'][bone].get('rotation');b=strike['bones'][bone].get('rotation')
   if isinstance(a,dict) and isinstance(b,dict) and '1.9' in a and '0.0' in b:
    assert a['1.9']==b['0.0'],(i,style,bone)
  for n in range(4):
   bone=f'g{i}_shin_{n}';assert skeleton[bone]['parent']==f'g{i}_leg_{n}'
   a=wind['bones'][bone]['rotation'];b=strike['bones'][bone]['rotation']
   assert a['1.9']==b['0.0'] and b['0.38']==[0,0,0],(i,style,bone)
   assert max(abs(v) for v in a['1.9'])<=7
  for anim,t in ((wind,1.9),(strike,.12)):
   vertices=[v for quad,_ in collect(posed(model,anim,t)) for v in quad]
   assert vertices and all(math.isfinite(x) and abs(x)<256 for v in vertices for x in v),(i,style,t)
   count+=1
assert count==48
subprocess.run([sys.executable,str(root/'tools/sync_guardian_detail_animations.py'),'--check'],cwd=root,check=True)
print('8 guardian rigs × 3 techniques: 48 finite pose samples, 192 restrained shin tracks and matching rotation keys (static only)')
