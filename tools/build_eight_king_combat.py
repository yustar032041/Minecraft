#!/usr/bin/env python3
"""Build provisional attack tracks for the redesigned eight-realm king.

No behavior, damage, timings, geometry, existing locomotion or textures change.
"""
import argparse,copy,json
from pathlib import Path
RP=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack'

def encoded(x):return (json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode()

def build():
 poses={
  'cleave':{'body':[0,-12,0],'head':[4,12,0],'arm_r':[-62,0,16],'forearm_r':[-24,0,0],'arm_l':[-12,0,-12],'cape':[8,0,0]},
  'cast':{'body':[-8,0,0],'head':[6,0,0],'arm_l':[-46,0,-24],'arm_r':[-46,0,24],'forearm_l':[-16,0,0],'forearm_r':[-16,0,0],'halo':[0,0,8],'core':[0,0,-8]},
  'wave':{'body':[-12,0,0],'head':[10,0,0],'arm_l':[-24,0,-45],'arm_r':[-24,0,45],'forearm_l':[-12,0,-8],'forearm_r':[-12,0,8],'halo':[0,0,12],'cape':[15,0,0]}
 }
 model=json.loads((RP/'models/entity/eclipse_colossus.geo.json').read_text())['minecraft:geometry'][0];bones={b['name'] for b in model['bones']}
 animations={}
 for style,pose in poses.items():
  if not set(pose)<=bones:raise ValueError(f'missing king bones: {set(pose)-bones}')
  for phase in ('windup','strike'):
   tracks={}
   for bone,end in pose.items():
    keys={'0.0':[0,0,0],'0.65':[round(v*.45,2) for v in end],'1.9':end} if phase=='windup' else {'0.0':end,'0.12':[round(-v*.45,2) for v in end],'0.38':[0,0,0]}
    tracks[bone]={'rotation':keys}
   animations[f'animation.hakkai.eclipse_{style}_{phase}']={'animation_length':1.9 if phase=='windup' else .38,'bones':tracks}
 # Native melee is triggered on contact without the warned windup. Starting
 # at the windup endpoint would make the rig jump. Keep later cleave keys.
 contact=copy.deepcopy(animations['animation.hakkai.eclipse_cleave_strike'])
 for track in contact['bones'].values():track['rotation']['0.0']=[0,0,0]
 animations['animation.hakkai.eclipse_cleave_contact']=contact
 path=RP/'entity/eclipse_colossus.entity.json';client=json.loads(path.read_text());aliases=client['minecraft:client_entity']['description']['animations']
 for style in poses:
  for phase in ('windup','strike'):aliases[f'eclipse_{style}_{phase}']=f'animation.hakkai.eclipse_{style}_{phase}'
 aliases['eclipse_cleave_contact']='animation.hakkai.eclipse_cleave_contact'
 return {RP/'animations/eight_king_combat.animation.json':encoded({'format_version':'1.8.0','animations':animations}),path:encoded(client)}

def main():
 p=argparse.ArgumentParser();g=p.add_mutually_exclusive_group(required=True);g.add_argument('--write',action='store_true');g.add_argument('--check',action='store_true');a=p.parse_args()
 for path,data in build().items():
  if a.write:path.write_bytes(data)
  elif not path.exists() or path.read_bytes()!=data:raise SystemExit(f'king combat visuals stale: {path}')
 print('Eight-realm king: three two-phase poses and contact track '+('written' if a.write else 'verified')+' (static only)')
if __name__=='__main__':main()
