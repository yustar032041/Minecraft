#!/usr/bin/env python3
"""Map existing motion to twelve individually designed forest foe rigs.

No behavior, AI, hitbox or attack value changes; combat poses are provisional.
"""
import argparse,copy,json
from mob_attack_joint_details import add_details,align_strike_start
from pathlib import Path
RP=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack'
def enc(x):return (json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode()
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 src={}
 for f in ('wild.animation.json','creature_anatomy_attacks.animation.json'):src.update(json.loads((RP/'animations'/f).read_text())['animations'])
 outputs={};tracks={}
 for i,(walkname,attack) in enumerate((('fox','cast_quadruped'),('bird','cast_wings'),('brute','lunge_arms'),('bug','brace_quadruped'),('fox','lunge_quadruped'),('bird','cast_wings'),('spider','cast_arachnid'),('hare','cast_quadruped'),('brute','cast_arms'),('bird','cast_wings'),('fox','cast_quadruped'),('spider','cast_arachnid'))):
  name=f'foe_1_{i}';prefix=f'f1_{i}_';bones={b['name'] for b in json.loads((RP/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0]['bones']}
  walk=copy.deepcopy(src[f'animation.hakkai.{walkname}.stride'])
  if i==0:
   walk['bones']['tail']={'rotation':[0,'math.cos(query.anim_time * 270) * 6',0]}
   walk['bones']['tail_fan']={'rotation':[0,'math.cos(query.anim_time * 270 - 40) * 7',0]}
  if i==1:
   for side,phase in (('l',0),('r',180)):walk['bones'][f'wing_{side}_tip']={'rotation':[0,0,f'math.cos(query.anim_time * 580 + {phase}) * 12']}
  if i==2:
   for side,phase in (('l',0),('r',180)):walk['bones'][f'forearm_{side}']={'rotation':[f'math.cos(query.anim_time * 300 + {phase}) * 6',0,0]}
  if i==3:
   for side,phase in (('l',0),('r',180)):walk['bones']['shell_'+side]={'rotation':[0,0,f'math.cos(query.anim_time * 300 + {phase}) * 2']}
  if i==4:
   for n,phase in (('tail',0),('tail_mid',40),('tail_tip',80)):walk['bones'][n]={'rotation':[0,f'math.cos(query.anim_time * 270 - {phase}) * 7',0]}
  if i==5:
   for side,phase in (('l',0),('r',180)):walk['bones'][f'wing_{side}_tip']={'rotation':[0,0,f'math.cos(query.anim_time * 580 + {phase}) * 11']}
  if i==6:
   for n in range(8):walk['bones'][f'leg_tip_{n}']={'rotation':[0,0,f'math.cos(query.anim_time * 360 + {n%2*180}) * 5']}
  if i==7:
   for side,phase in (('l',0),('r',45)):walk['bones'][f'ear_{side}']={'rotation':[f'math.cos(query.anim_time * 300 + {phase}) * 5',0,0]}
  if i==8:
   for side,phase in (('l',0),('r',180)):walk['bones'][f'forearm_{side}']={'rotation':[f'math.cos(query.anim_time * 300 + {phase}) * 6',0,0]}
  if i==9:
   for side,phase in (('l',0),('r',180)):walk['bones'][f'wing_{side}_tip']={'rotation':[0,0,f'math.cos(query.anim_time * 580 + {phase}) * 10']}
  if i==10:
   walk['bones']['tail']={'rotation':[0,'math.cos(query.anim_time * 270) * 5',0]}
   walk['bones']['tail_blade']={'rotation':[0,'math.cos(query.anim_time * 270 - 45) * 7',0]}
   for n in range(4):walk['bones'][f'hock_{n}']={'rotation':[f'math.cos(query.anim_time * 300 + {n%2*180}) * 8',0,0]}
  if i==11:
   for n in range(8):walk['bones'][f'leg_tip_{n}']={'rotation':[0,0,f'math.cos(query.anim_time * 360 + {n%2*180}) * 6']}
  anims={'walk':walk}
  for phase in ('windup','strike'):anims[phase]=copy.deepcopy(src[f'animation.hakkai.creature_{attack}_{phase}'])
  if i==3:
   for phase in ('windup','strike'):
    for n in (4,5):anims[phase]['bones'][f'leg_{n}']=copy.deepcopy(anims[phase]['bones'][f'leg_{n-2}'])
  add_details(anims,bones,prefix,1,i)
  if i==4:align_strike_start(anims)
  # Keep native contact animation unchanged; it has no scripted windup.
  anims['contact']=copy.deepcopy(anims['strike'])
  align_strike_start(anims)
  for label,anim in anims.items():
   anim['bones']={prefix+n:track for n,track in anim['bones'].items()}
   if not set(anim['bones'])<=bones:raise ValueError(f'{name}/{label} missing {set(anim["bones"])-bones}')
   tracks[f'animation.hakkai.{name}_{label}']=anim
  path=RP/f'entity/{name}.entity.json';obj=json.loads(path.read_text(encoding='utf8'));alias=obj['minecraft:client_entity']['description']['animations']
  alias['walk']=f'animation.hakkai.{name}_walk'
  for phase in ('windup','strike'):
   for kind in ('creature','talent'):alias[f'{kind}_{phase}']=f'animation.hakkai.{name}_{phase}'
  alias['native_contact']=f'animation.hakkai.{name}_contact'
  outputs[path]=enc(obj)
 outputs[RP/'animations/forest_foe_individual.animation.json']=enc({'format_version':'1.8.0','animations':tracks})
 for path,data in outputs.items():
  if a.write:path.write_bytes(data)
  elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Forest foe visual sync stale: '+str(path))
 print('Forest foes: 12 clients and 48 remapped animations '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
