#!/usr/bin/env python3
"""Bind forest wildlife's bespoke rigs to remapped existing movement/attacks.

Derived tracks are temporary compatibility, not final species-specific combat.
No behavior, combat values or collision boxes are modified.
"""
import argparse,copy,json
from mob_attack_joint_details import align_strike_start, neutral_wild_contact
from pathlib import Path
RP=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack'
def encoded(obj):return (json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode()
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 src={}
 for name in ('wild.animation.json','creature_attacks.animation.json','creature_anatomy_attacks.animation.json'):
  src.update(json.loads((RP/'animations'/name).read_text())['animations'])
 outputs={};out={}
 for i,walkname in enumerate(('bird','hare','fox')):
  name=f'wild_1_{i}';prefix=f'w1_{i}_';bones={b['name'] for b in json.loads((RP/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0]['bones']}
  walk=copy.deepcopy(src[f'animation.hakkai.{walkname}.stride'])
  if i==0:
   for side,phase in (('l',0),('r',180)):
    walk['bones'][f'wing_{side}_tip']={'rotation':[0,0,f'math.cos(query.anim_time * 580 + {phase}) * 13']}
   walk['bones']['tail']={'rotation':['math.cos(query.anim_time * 290) * 4',0,0]}
  elif i==1:
   walk['bones']['tail']={'rotation':[0,'math.cos(query.anim_time * 260) * 8',0]}
   walk['bones']['tail_mid']={'rotation':[0,'math.cos(query.anim_time * 260 - 45) * 8',0]}
   walk['bones']['tail_tip']={'rotation':[0,'math.cos(query.anim_time * 260 - 90) * 8',0]}
  else:
   walk['bones']['tail']={'rotation':[0,'math.cos(query.anim_time * 300) * 6',0]}
   walk['bones']['tail_tip']={'rotation':[0,'math.cos(query.anim_time * 300 - 45) * 8',0]}
   for leg in range(4):walk['bones'][f'hock_{leg}']={'rotation':[f'math.cos(query.anim_time * 430 + {0 if leg%2==0 else 180}) * -7',0,0]}
  actions={'walk':walk}
  for phase in ('windup','strike'):
   source=f'animation.hakkai.creature_lunge_quadruped_{phase}' if i==2 else f'animation.hakkai.creature_{phase}'
   actions[phase]=copy.deepcopy(src[source])
  if i==1:actions['contact']=neutral_wild_contact(actions['strike'],bones,prefix,1)
  if i==2:
   actions['contact']=copy.deepcopy(actions['strike'])
   align_strike_start(actions)
  for label,anim in actions.items():
   anim['bones']={prefix+joint:track for joint,track in anim['bones'].items()}
   if not set(anim['bones'])<=bones:raise ValueError(f'{name}/{label} missing: {set(anim["bones"])-bones}')
   out[f'animation.hakkai.{name}_{label}']=anim
  path=RP/f'entity/{name}.entity.json';obj=json.loads(path.read_text(encoding='utf8'));anims=obj['minecraft:client_entity']['description']['animations']
  anims['walk']=f'animation.hakkai.{name}_walk'
  for phase in ('windup','strike'):
   anims[f'creature_{phase}']=f'animation.hakkai.{name}_{phase}'
   if i==2:anims[f'talent_{phase}']=f'animation.hakkai.{name}_{phase}'
  if i in (1,2):anims['native_contact']=f'animation.hakkai.{name}_contact'
  outputs[path]=encoded(obj)
 outputs[RP/'animations/forest_wild_individual.animation.json']=encoded({'format_version':'1.8.0','animations':out})
 for path,data in outputs.items():
  if a.write:path.write_bytes(data)
  elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Forest wildlife visual sync stale: '+str(path))
 print('Forest wildlife: 3 clients and 11 remapped animations '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
