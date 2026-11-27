#!/usr/bin/env python3
"""Remap original movement/attack tracks to 12 individual grassland foe rigs.
Only client animation aliases and derived resource animations are changed.
"""
import argparse,copy,json
from mob_attack_joint_details import add_details,align_strike_start,add_refined_joints,neutral_refined_contact
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack'
WALKS=['deer','brute','brute','bug','fox','bird','spider','hare','deer','bird','brute','hare']
STYLES=['lunge','brace','lunge','brace','lunge','cast','cast','cast','cast','cast','cast','cast']
def encoded(o):return (json.dumps(o,ensure_ascii=False,indent=2)+'\n').encode()
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');args=p.parse_args()
 if args.write==args.check:p.error('choose exactly one of --write or --check')
 sources={}
 for f in ('wild.animation.json','creature_anatomy_attacks.animation.json'):
  sources.update(json.loads((ROOT/'animations'/f).read_text())['animations'])
 anims={};outputs={}
 for i in range(12):
  ident=f'foe_0_{i}';prefix=f'f0_{i}_';geo=json.loads((ROOT/'models/entity'/f'{ident}.geo.json').read_text())['minecraft:geometry'][0];bones={b['name'] for b in geo['bones']}
  def has(n):return prefix+n in bones
  anatomy='wings' if has('wing_l') and has('wing_r') else 'arms' if has('arm_l') and has('arm_r') else 'arachnid' if all(has(f'leg_{j}') for j in range(8)) else 'quadruped'
  walk=copy.deepcopy(sources[f'animation.hakkai.{WALKS[i]}.stride'])
  # New wings on the crow and petal-wing use the existing bird wing tracks.
  if i in (4,11):
   bird=sources['animation.hakkai.bird.stride']['bones']
   for wing in ('wing_l','wing_r'):walk['bones'][wing]=copy.deepcopy(bird[wing])
  templates={'walk':walk}
  for phase in ('windup','strike'):
   item=copy.deepcopy(sources[f'animation.hakkai.creature_{STYLES[i]}_{anatomy}_{phase}'])
   # Six-legged earth eater: include its two rear legs rather than leaving
   # them out of the reused four-leg attack template.
   if i==3:
    item['bones']['leg_4']=copy.deepcopy(item['bones']['leg_2']);item['bones']['leg_5']=copy.deepcopy(item['bones']['leg_3'])
   templates[phase]=item
  # Five early rigs have no articulated appendage joints. Shape their
  # existing body/head tracks instead of rotating decorative cubes detached
  # from the body: guarded thorns, forward rock charge, low shell brace,
  # low spider feint and a restrained twist for the bladed brute.
  root_poses={1:([-11,0,7],[-10,0,-5]),2:([-20,0,0],[-12,0,0]),
              3:([-6,0,3],[-8,0,-3]),6:([-5,0,4],[-7,0,-4]),
              10:([0,18,0],[0,-8,0])}
  if i in root_poses:
   for bone,end in zip(('body','head'),root_poses[i]):
    templates['windup']['bones'][bone]={'rotation':{'0.0':[0,0,0],'0.65':[round(v*.45,2) for v in end],'1.9':end}}
    templates['strike']['bones'][bone]={'rotation':{'0.0':end,'0.12':[round(-v*.7,2) for v in end],'0.38':[0,0,0]}}
  add_details(templates,bones,prefix,0,i)
  add_refined_joints(templates,bones,prefix,0,i)
  if i==4:align_strike_start(templates)
  # Native contact has no scripted windup; new joints begin neutral.
  templates['contact']=copy.deepcopy(templates['strike'])
  neutral_refined_contact(templates,0,i)
  align_strike_start(templates)
  for label,item in templates.items():
   item['bones']={prefix+bone:track for bone,track in item['bones'].items()}
   if not set(item['bones'])<=bones:raise ValueError(f'{ident} missing joints for {label}: {set(item["bones"])-bones}')
   anims[f'animation.hakkai.{ident}_{label}']=item
  path=ROOT/'entity'/f'{ident}.entity.json';obj=json.loads(path.read_text());desc=obj['minecraft:client_entity']['description'];desc['animations']['walk']=f'animation.hakkai.{ident}_walk'
  for phase in ('windup','strike'):
   for alias in ('creature','talent'):desc['animations'][f'{alias}_{phase}']=f'animation.hakkai.{ident}_{phase}'
  desc['animations']['native_contact']=f'animation.hakkai.{ident}_contact'
  outputs[path]=encoded(obj)
 outputs[ROOT/'animations/grassland_foe_individual.animation.json']=encoded({'format_version':'1.8.0','animations':anims})
 for path,data in outputs.items():
  if args.write:path.write_bytes(data)
  elif not path.exists() or path.read_bytes()!=data:raise SystemExit(f'Grassland foe visual sync stale: {path}')
 print('Twelve grassland foe clients and 48 individual rig animations '+('written' if args.write else 'verified'))
if __name__=='__main__':main()
