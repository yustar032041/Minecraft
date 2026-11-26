#!/usr/bin/env python3
"""Remap old walk and attack tracks onto twelve terminus enemy rigs."""
import argparse,copy,json
from mob_attack_joint_details import add_details,align_strike_start
from pathlib import Path
RP=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack'
def enc(obj):return (json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode()
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 src={}
 for f in ('wild.animation.json','creature_anatomy_attacks.animation.json'):src.update(json.loads((RP/'animations'/f).read_text())['animations'])
 tracks={};outputs={}
 for i,(stride,attack) in enumerate((('fox','cast_quadruped'),('brute','cast_arms'),('brute','lunge_arms'),('bug','brace_quadruped'),('fox','cast_quadruped'),('bird','cast_wings'),('spider','cast_arachnid'),('hare','cast_quadruped'),('brute','cast_arms'),('hare','cast_quadruped'),('fox','cast_quadruped'),('bird','cast_wings'))):
  name=f'foe_7_{i}';prefix=f'f7_{i}_';bones={b['name'] for b in json.loads((RP/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0]['bones']}
  walk=copy.deepcopy(src[f'animation.hakkai.{stride}.stride'])
  if i in (0,10):
   for n in range(4):walk['bones'][f'piston_{n}']={'rotation':[f'math.cos(query.anim_time * 300 + {n%2*180}) * 6',0,0]}
  if i==0:
   for n,phase in (('tail',0),('tail_tip',45)):walk['bones'][n]={'rotation':[0,f'math.cos(query.anim_time * 270 - {phase}) * 5',0]}
  if i in (1,8):
   for side,phase in (('l',0),('r',180)):walk['bones'][f'hand_{side}']={'rotation':[f'math.cos(query.anim_time * 300 + {phase}) * 5',0,0]}
  if i==2:
   for side,phase in (('l',0),('r',180)):walk['bones'][f'fist_{side}']={'rotation':[f'math.cos(query.anim_time * 300 + {phase}) * 6',0,0]}
  if i in (3,6):
   for n in range(6 if i==3 else 8):walk['bones'][f'foot_{n}']={'rotation':[0,0,f'math.cos(query.anim_time * 300 + {n%2*180}) * 5']}
  if i==4:
   for n,phase in (('tail',0),('tail_mid',45),('tail_tip',90)):walk['bones'][n]={'rotation':[0,f'math.cos(query.anim_time * 270 - {phase}) * 5',0]}
  if i in (5,11):
   for side,phase in (('l',0),('r',180)):walk['bones'][f'wing_{side}_tip']={'rotation':[0,0,f'math.cos(query.anim_time * 450 + {phase}) * 6']}
  if i in (7,9):
   for side,phase in (('l',0),('r',35)):walk['bones'][f'ear_{side}']={'rotation':[f'math.cos(query.anim_time * 300 + {phase}) * 5',0,0]}
  if i==9:
   for n in range(4):walk['bones'][f'hock_{n}']={'rotation':[f'math.cos(query.anim_time * 300 + {n%2*180}) * 7',0,0]}
  anims={'walk':walk}
  for phase in ('windup','strike'):
   anims[phase]=copy.deepcopy(src[f'animation.hakkai.creature_{attack}_{phase}'])
   if i==3:
    for n in (4,5):anims[phase]['bones'][f'leg_{n}']=copy.deepcopy(anims[phase]['bones'][f'leg_{n-2}'])
   # Add restrained action to the rebuilt secondary joints. Keyframes line
   # up across phases; visuals remain independent of damage and movement.
   detail={0:{'clock_back':[0,0,8],'piston_0':[8,0,0],'piston_1':[-8,0,0]},
           1:{'station_clock':[0,0,-10],'hand_l':[8,0,0],'hand_r':[-8,0,0]},
           9:{'hourglass':[0,0,8],'ear_l':[-8,0,0],'ear_r':[-8,0,0]},
           10:{'clock_hand':[0,0,18],'piston_0':[9,0,0],'piston_1':[-9,0,0]},
           11:{'clock_crest':[0,0,9],'wing_l_tip':[0,0,12],'wing_r_tip':[0,0,-12]}}.get(i,{})
   for bone,end in detail.items():
    mid=[round(-v*.7,2) for v in end]
    keys={'0.0':[0,0,0],'1.9':end} if phase=='windup' else {'0.0':end,'0.12':mid,'0.38':[0,0,0]}
    anims[phase]['bones'][bone]={'rotation':keys}
  add_details(anims,bones,prefix,7,i)
  # Keep native contact animation unchanged; it has no scripted windup.
  anims['contact']=copy.deepcopy(anims['strike'])
  align_strike_start(anims)
  for label,anim in anims.items():
   anim['bones']={prefix+n:track for n,track in anim['bones'].items()}
   if not set(anim['bones'])<=bones:raise ValueError(f'{name}/{label}: missing {set(anim["bones"])-bones}')
   tracks[f'animation.hakkai.{name}_{label}']=anim
  path=RP/f'entity/{name}.entity.json';obj=json.loads(path.read_text(encoding='utf8'));aliases=obj['minecraft:client_entity']['description']['animations'];aliases['walk']=f'animation.hakkai.{name}_walk'
  for phase in ('windup','strike'):
   for kind in ('creature','talent'):aliases[f'{kind}_{phase}']=f'animation.hakkai.{name}_{phase}'
  aliases['native_contact']=f'animation.hakkai.{name}_contact'
  outputs[path]=enc(obj)
 outputs[RP/'animations/clockwork_foe_individual.animation.json']=enc({'format_version':'1.8.0','animations':tracks})
 for path,data in outputs.items():
  if a.write:path.write_bytes(data)
  elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Clockwork foe visual sync stale: '+str(path))
 print('Clockwork foes: 12 clients and 48 remapped animations '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
