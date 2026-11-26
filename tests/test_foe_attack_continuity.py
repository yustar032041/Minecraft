"""96 rig joins and contact tracks; does not model Bedrock blending."""
import json,math,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from preview_mob_pose import posed
from preview_mob_geometry import collect
rp=root/'Hakkai_v7.1.0/ResourcePack';names=('grassland','forest','desert','ice','storm','underworld','sky','clockwork');matched=changed=0
for r,f in enumerate(names):
 anims=json.loads((rp/f'animations/{f}_foe_individual.animation.json').read_text())['animations']
 for i in range(12):
  name=f'foe_{r}_{i}';aid=f'animation.hakkai.{name}'
  model=json.loads((rp/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0];bones={b['name'] for b in model['bones']}
  client=json.loads((rp/f'entity/{name}.entity.json').read_text())['minecraft:client_entity']['description']
  assert client['animations']['native_contact']==aid+'_contact'
  wind,strike,contact=(anims[aid+'_'+x] for x in ('windup','strike','contact'))
  assert (wind['animation_length'],strike['animation_length'],contact['animation_length'])==(1.9,.38,.38)
  assert all(set(a['bones'])<=bones for a in (wind,strike,contact))
  for bone in set(wind['bones'])&set(strike['bones']):
   a=wind['bones'][bone].get('rotation');b=strike['bones'][bone].get('rotation')
   if isinstance(a,dict) and isinstance(b,dict) and '1.9' in a and '0.0' in b:
    assert a['1.9']==b['0.0'],(name,bone);matched+=1
  assert contact['bones'].keys()==strike['bones'].keys()
  for bone in contact['bones']:
   a=contact['bones'][bone]['rotation'];b=strike['bones'][bone]['rotation']
   assert a.keys()==b.keys()
   for t in a:
    if t!='0.0':assert a[t]==b[t],(name,bone,t)
    elif a[t]!=b[t]:changed+=1
  # Numerical samples are approximate geometry only, not interpolation/blending.
  for anim,t in ((wind,1.9),(strike,.12),(contact,.12)):
   points=[v for quad,_ in collect(posed(model,anim,t)) for v in quad]
   assert points and all(math.isfinite(n) and abs(n)<256 for p in points for n in p),(name,t)
assert matched>300 and changed>200,(matched,changed)
print(f'96 foe rigs: {matched} matching common rotations, {changed} contact-specific starting keys, 288 approximate samples (static only)')
