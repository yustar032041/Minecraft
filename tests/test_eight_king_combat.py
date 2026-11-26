"""Boss pose assets and bone references, not an engine/rendering test."""
import json,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];rp=root/'Hakkai_v7.1.0/ResourcePack'
subprocess.run([sys.executable,str(root/'tools/build_eight_king_combat.py'),'--check'],cwd=root,check=True)
bones={b['name'] for b in json.loads((rp/'models/entity/eclipse_colossus.geo.json').read_text())['minecraft:geometry'][0]['bones']}
anims=json.loads((rp/'animations/eight_king_combat.animation.json').read_text())['animations'];assert len(anims)==7
aliases=json.loads((rp/'entity/eclipse_colossus.entity.json').read_text())['minecraft:client_entity']['description']['animations']
for style in ('cleave','cast','wave'):
 w=anims[f'animation.hakkai.eclipse_{style}_windup'];s=anims[f'animation.hakkai.eclipse_{style}_strike']
 assert (w['animation_length'],s['animation_length'])==(1.9,.38) and w['bones'].keys()==s['bones'].keys() and set(w['bones'])<=bones
 for n in w['bones']:
  assert w['bones'][n]['rotation']['1.9']==s['bones'][n]['rotation']['0.0']
  assert s['bones'][n]['rotation']['0.38']==[0,0,0]
 for phase in ('windup','strike'):assert aliases[f'eclipse_{style}_{phase}']==f'animation.hakkai.eclipse_{style}_{phase}'
assert {'forearm_l','forearm_r','halo','core'}<=set(anims['animation.hakkai.eclipse_cast_strike']['bones'])
contact=anims['animation.hakkai.eclipse_cleave_contact'];strike=anims['animation.hakkai.eclipse_cleave_strike']
assert aliases['eclipse_cleave_contact']=='animation.hakkai.eclipse_cleave_contact'
assert set(contact['bones'])==set(strike['bones'])<=bones and contact['animation_length']==strike['animation_length']
for bone,track in contact['bones'].items():
 assert track['rotation']['0.0']==[0,0,0]
 for key in ('0.12','0.38'):assert track['rotation'][key]==strike['bones'][bone]['rotation'][key]
print('King 3 styles, 6 warned phases and neutral-start contact, aliases and keyframes OK (static only)')
