#!/usr/bin/env python3
"""Build cosmetic attack tracks for the existing protected FUSHI chief rig.

No geometry, textures, collision, attack, target, timers or AI are changed.
Keyframe/render semantics require Bedrock testing; idle blending is unknown.
"""
import argparse,json
from pathlib import Path
RP=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack'
OUT=RP/'animations/fushi_chief_attacks.animation.json'
CLIENT=RP/'entity/fushi_chief.entity.json'
# Three non-parented joints: keep angles restrained so their separate pivots
# do not create exaggerated gaps in the approximated pose.
POSES={
 'impact':{'body':[-6,0,0],'head':[-3,0,0],'crown':[-3,0,0]},
 'moon':{'body':[0,-5,0],'head':[0,-4,0],'crown':[0,-4,0]},
 'mist':{'body':[0,0,4],'head':[0,0,2],'crown':[0,0,2]},
}
def encoded(obj):return (json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode('utf8')
def build():
 model=json.loads((RP/'models/entity/fushi_chief.geo.json').read_text())['minecraft:geometry'][0]
 bones={b['name'] for b in model['bones']}
 client=json.loads(CLIENT.read_text(encoding='utf8'));desc=client['minecraft:client_entity']['description'];aliases=desc['animations'];animations={}
 for style,pose in POSES.items():
  if not set(pose)<=bones:raise ValueError('chief missing required joints')
  for phase in ('windup','strike'):
   aid=f'animation.hakkai.fushi_chief_{style}_{phase}'
   tracks={}
   for bone,end in pose.items():
    if phase=='windup':keys={'0.0':[0,0,0],'1.9':end}
    else:keys={'0.0':end,'0.12':[round(-v*.6,2) for v in end],'0.38':[0,0,0]}
    tracks[bone]={'rotation':keys}
   animations[aid]={'animation_length':1.9 if phase=='windup' else .38,'bones':tracks}
   aliases[f'chief_{style}_{phase}']=aid
 return {OUT:encoded({'format_version':'1.8.0','animations':animations}),CLIENT:encoded(client)}
def main():
 p=argparse.ArgumentParser();group=p.add_mutually_exclusive_group(required=True);group.add_argument('--write',action='store_true');group.add_argument('--check',action='store_true');a=p.parse_args()
 for path,data in build().items():
  if a.write:path.write_bytes(data)
  elif not path.exists() or path.read_bytes()!=data:raise SystemExit(f'FUSHI chief animation stale: {path}')
 print('FUSHI chief: 6 provisional cosmetic attack tracks '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
