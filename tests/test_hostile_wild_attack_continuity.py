"""Hostile wildlife pose joins and native contact; static approximations only."""
import json,math,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from preview_mob_pose import posed
from preview_mob_geometry import collect
rp=root/'Hakkai_v7.1.0/ResourcePack';names=['grassland','forest','desert','ice_storm','ice_storm','underworld','sky','clockwork'];matched=changed=0
for r,f in enumerate(names):
 name=f'wild_{r}_2';aid=f'animation.hakkai.{name}';anims=json.loads((rp/f'animations/{f}_wild_individual.animation.json').read_text())['animations']
 model=json.loads((rp/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0];bones={b['name'] for b in model['bones']}
 desc=json.loads((rp/f'entity/{name}.entity.json').read_text())['minecraft:client_entity']['description'];assert desc['animations']['native_contact']==aid+'_contact'
 wind,strike,contact=(anims[aid+'_'+part] for part in ('windup','strike','contact'))
 assert (wind['animation_length'],strike['animation_length'],contact['animation_length'])==(1.9,.38,.38)
 for anim in (wind,strike,contact):assert set(anim['bones'])<=bones
 for bone in set(wind['bones'])&set(strike['bones']):
  a=wind['bones'][bone].get('rotation');b=strike['bones'][bone].get('rotation')
  if isinstance(a,dict) and isinstance(b,dict) and '1.9' in a and '0.0' in b:assert a['1.9']==b['0.0'];matched+=1
 for bone in contact['bones']:
  a=contact['bones'][bone]['rotation'];b=strike['bones'][bone]['rotation'];assert a.keys()==b.keys()
  for t in a:
   if t!='0.0':assert a[t]==b[t]
   elif a[t]!=b[t]:changed+=1
 for anim,t in ((wind,1.9),(strike,.12),(contact,.12)):
  points=[v for quad,_ in collect(posed(model,anim,t)) for v in quad]
  assert points and all(math.isfinite(n) and abs(n)<256 for p in points for n in p),(name,t)
assert matched>=40 and changed==28,(matched,changed)
print(f'8 hostile wildlife: {matched} common rotations, {changed} contact-specific starting keys, 24 pose samples (static only)')
