"""Guardian native melee's cosmetic tracks: static poses, not Bedrock playback."""
import json,math,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from preview_mob_pose import posed
from preview_mob_geometry import collect
rp=root/'Hakkai_v7.1.0/ResourcePack'
rig=json.loads((rp/'animations/guardian_individual_rigs.animation.json').read_text())['animations']
for i in range(8):
 name=f'guardian_{i}';id=f'animation.hakkai.{name}';geo=json.loads((rp/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0];bones={b['name'] for b in geo['bones']}
 client=json.loads((rp/f'entity/{name}.entity.json').read_text())['minecraft:client_entity']['description'];assert client['animations']['native_contact']==id+'_contact'
 strike=rig[id+'_strike'];contact=rig[id+'_contact'];assert contact['animation_length']==strike['animation_length']==.38
 assert set(strike['bones'])<=set(contact['bones'])<=bones
 for bone in strike['bones']:
  s=strike['bones'][bone]['rotation'];c=contact['bones'][bone]['rotation']
  assert c['0.0']==[0,0,0] and c['0.12']==s['0.12'] and c['0.38']==s['0.38']
 for n in range(4):
  r=contact['bones'][f'g{i}_leg_{n}']['rotation'];assert r['0.0']==r['0.38']==[0,0,0] and max(abs(v) for v in r['0.12'])<=6
 if i==6:
  for side in ('l','r'):
   r=contact['bones'][f'g{i}_wing_{side}']['rotation'];assert r['0.0']==r['0.38']==[0,0,0] and max(abs(v) for v in r['0.12'])<=12
 for t in (0,.12,.38):
  points=[p for quad,_ in collect(posed(geo,contact,t)) for p in quad]
  assert points and all(math.isfinite(n) and abs(n)<256 for p in points for n in p)
print('8 guardian native contact tracks: neutral start, restrained feet/wing motion and 24 finite poses (static only)')
