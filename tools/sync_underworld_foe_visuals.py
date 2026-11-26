#!/usr/bin/env python3
"""Remap existing motion onto underground foe joints; provisional, cosmetic only."""
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
 motions=[('bug','brace_quadruped'),('spider','cast_arachnid'),('brute','lunge_arms'),('bug','brace_quadruped'),('fox','lunge_quadruped'),('bird','cast_wings'),('spider','cast_arachnid'),('hare','cast_quadruped'),('bug','cast_quadruped'),('spider','cast_arachnid'),('brute','cast_arms'),('bird','cast_wings')]
 for i,(stride,attack) in enumerate(motions):
  name=f'foe_5_{i}';prefix=f'f5_{i}_';bones={b['name'] for b in json.loads((RP/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0]['bones']}
  walk=copy.deepcopy(src[f'animation.hakkai.{stride}.stride'])
  if stride in ('bug','spider'):
   for n in range(6 if stride=='bug' else 8):walk['bones'][f'tip_{n}']={'rotation':[0,0,f'math.cos(query.anim_time * 300 + {n%2*180}) * 5']}
  if i in (2,10):
   for side,phase in (('l',0),('r',180)):walk['bones'][f'fist_{side}']={'rotation':[f'math.cos(query.anim_time * 300 + {phase}) * 6',0,0]}
  if i in (5,11):
   for side,phase in (('l',0),('r',180)):walk['bones'][f'wing_{side}_tip']={'rotation':[0,0,f'math.cos(query.anim_time * 580 + {phase}) * 8']}
  if i==4:
   for part,phase in (('tail',0),('tail_mid',45),('tail_tip',90)):walk['bones'][part]={'rotation':[0,f'math.cos(query.anim_time * 270 - {phase}) * 6',0]}
  if i==7:
   for side,phase in (('l',0),('r',35)):walk['bones'][f'ear_{side}']={'rotation':[f'math.cos(query.anim_time * 300 + {phase}) * 5',0,0]}
  anims={'walk':walk}
  for phase in ('windup','strike'):
   anims[phase]=copy.deepcopy(src[f'animation.hakkai.creature_{attack}_{phase}'])
   if stride=='bug':
    for n in (4,5):anims[phase]['bones'][f'leg_{n}']=copy.deepcopy(anims[phase]['bones'][f'leg_{n-2}'])
  add_details(anims,bones,prefix,5,i)
  if i==4:align_strike_start(anims)
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
 outputs[RP/'animations/underworld_foe_individual.animation.json']=enc({'format_version':'1.8.0','animations':tracks})
 for path,data in outputs.items():
  if a.write:path.write_bytes(data)
  elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Underworld foe visual sync stale: '+str(path))
 print('Underworld foes: 12 clients and 48 remapped animations '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
