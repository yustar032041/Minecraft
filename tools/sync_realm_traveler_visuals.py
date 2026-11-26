#!/usr/bin/env python3
"""Sync the eight individual traveler geometries and their cosmetic animation tracks.
Behavior, attack timing, warning logic, collision and loot are untouched.
"""
import argparse,copy,json
from pathlib import Path
from mob_attack_joint_details import align_strike_start
from build_realm_traveler_art import DESIGNS
ROOT=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack'

# Eight realm-specific upper-arm gestures: (windup R/L, strike R/L).
# Each motion starts neutral, joins exactly at the warning/strike boundary,
# and returns neutral. Gameplay timers, hit detection and lower arms are kept.
GESTURES=[
 (([-20,0,12],[-20,0,-12]),([18,0,-18],[18,0,18])),      # wind sweep
 (([-16,0,8],[-27,0,-5]),([13,0,-10],[23,0,9])),         # drifting mist
 (([-30,8,3],[-12,-8,-12]),([22,-5,-10],[13,5,12])),     # wrapped sand
 (([-32,0,10],[-32,0,-10]),([20,0,4],[20,0,-4])),        # ice lift
 (([-38,0,14],[-12,0,-6]),([24,0,-16],[12,0,8])),        # lightning
 (([-24,10,2],[-24,-10,-2]),([20,-6,-4],[20,6,4])),      # grasping dark
 (([-15,0,24],[-15,0,-24]),([15,0,-18],[15,0,18])),      # spreading sky
 (([-30,5,5],[-18,-5,-5]),([12,-5,-4],[25,5,4])),        # clock hands
]

def encoded(o):return (json.dumps(o,ensure_ascii=False,indent=2)+'\n').encode('utf8')
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');args=p.parse_args()
 if args.write==args.check:p.error('choose exactly one of --write or --check')
 source={}
 for f in ('realm_ender.animation.json','creature_attacks.animation.json'):
  source.update(json.loads((ROOT/'animations'/f).read_text())['animations'])
 anims={};outputs={}
 for i in range(8):
  ident=f'ender_{i}';prefix=f'e{i}_';geo=json.loads((ROOT/'models/entity'/f'{ident}.geo.json').read_text())['minecraft:geometry'][0]
  bones={b['name'] for b in geo['bones']}
  mapped={label:copy.deepcopy(source[src]) for label,src in [('walk','animation.hakkai.realm_ender.walk'),('windup','animation.hakkai.creature_windup'),('strike','animation.hakkai.creature_strike')]}
  align_strike_start({'windup':mapped['windup'],'strike':mapped['strike']})
  for side,end,peak in zip(('right_arm','left_arm'),GESTURES[i][0],GESTURES[i][1]):
   if prefix+side not in bones:raise ValueError(f'{ident} missing {side}')
   halfway=[round(v*.42,2) for v in end]
   mapped['windup']['bones'][side]={'rotation':{'0.0':[0,0,0],'0.45':halfway,'1.9':end}}
   mapped['strike']['bones'][side]={'rotation':{'0.0':end,'0.12':peak,'0.38':[0,0,0]}}
  # Subtle forearm gesture for the warned counterattack, rather than leaving
  # the new lower-arm joints entirely motionless. Cosmetic, engine untested.
  for limb,angle in [('right_arm_lower',-6),('left_arm_lower',-6)]:
   if prefix+limb not in bones:raise ValueError(f'{ident} missing {limb}')
   end=[angle,0,0]
   mapped['windup']['bones'][limb]={'rotation':{'0.0':[0,0,0],'1.9':end}}
   mapped['strike']['bones'][limb]={'rotation':{'0.0':end,'0.12':[4,0,0],'0.38':[0,0,0]}}
  for label,entry in mapped.items():
   entry['bones']={prefix+name:track for name,track in entry['bones'].items()}
   if not set(entry['bones'])<=bones:raise ValueError(f'{ident} missing bone for {label}')
   anims[f'animation.hakkai.{ident}_{label}']=entry
  tracks={}
  for limb,phase in [('right_arm',180),('left_arm',0),('right_leg',0),('left_leg',180)]:
   key=prefix+limb+'_lower'
   if key not in bones:raise ValueError(f'{ident} missing lower limb {key}')
   tracks[key]={'rotation':[f'math.sin(query.anim_time * 360 + {phase}) * 7 * math.min(query.modified_move_speed * 4, 1)',0,0]}
  # Distinct pieces of cloth / feathers follow their own upper hinge. Rigid
  # crystals, shoulder plates and fungal growth deliberately remain rigid.
  # These are quiet cosmetic motions layered on existing walk/attack tracks.
  extras={0:[2,3],1:[2,3],2:[1,2],6:[2,3],7:[4]}.get(i,[])
  for n,j in enumerate(extras):
   key=f'{prefix}body_detail_{len(DESIGNS[i]["body"])+j}'
   if key not in bones:raise ValueError(f'{ident} missing decorative joint {key}')
   phase=n*120+i*23
   angle=2 if i==7 else 3
   tracks[key]={'rotation':[f'math.sin(query.anim_time * {55+i*3} + {phase}) * {angle}',0,0]}
  anims[f'animation.hakkai.{ident}_detail']={'loop':True,'bones':tracks}
  path=ROOT/'entity'/f'{ident}.entity.json';obj=json.loads(path.read_text());desc=obj['minecraft:client_entity']['description']
  desc['geometry']['default']=f'geometry.hakkai.{ident}';desc['animations']['walk']=f'animation.hakkai.{ident}_walk'
  for phase in ('windup','strike'):desc['animations'][f'creature_{phase}']=f'animation.hakkai.{ident}_{phase}'
  desc['animations']['traveler_detail']=f'animation.hakkai.{ident}_detail'
  arr=desc.setdefault('scripts',{}).setdefault('animate',[])
  if any(isinstance(v,dict) and 'traveler_detail' in v for v in arr) or arr.count('traveler_detail')>1:raise ValueError(f'{ident} conflicting detail')
  if 'traveler_detail' not in arr:arr.append('traveler_detail')
  outputs[path]=encoded(obj)
 outputs[ROOT/'animations/realm_traveler_individual.animation.json']=encoded({'format_version':'1.8.0','animations':anims})
 for path,data in outputs.items():
  if args.write:path.write_bytes(data)
  elif not path.exists() or path.read_bytes()!=data:raise SystemExit(f'Traveler visual sync stale: {path}')
 print('Eight traveler clients and 32 individual rig/detail animations '+('written' if args.write else 'verified'))
if __name__=='__main__':main()
