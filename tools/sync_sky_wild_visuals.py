#!/usr/bin/env python3
"""Bind three sky-wildlife rigs to provisional existing and joint tracks."""
import argparse,copy,json
from mob_attack_joint_details import align_strike_start, neutral_wild_contact
from pathlib import Path
RP=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack'
def enc(x):return (json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode()
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 src={}
 for f in ('wild.animation.json','creature_attacks.animation.json','creature_anatomy_attacks.animation.json'):src.update(json.loads((RP/'animations'/f).read_text())['animations'])
 outputs={};tracks={}
 for i,walkname in enumerate(('bird','deer','fox')):
  name=f'wild_6_{i}';prefix=f'w6_{i}_';bones={b['name'] for b in json.loads((RP/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0]['bones']}
  walk=copy.deepcopy(src[f'animation.hakkai.{walkname}.stride'])
  if i==0:
   for side,phase in (('l',0),('r',180)):walk['bones'][f'wing_{side}_tip']={'rotation':[0,0,f'math.cos(query.anim_time * 580 + {phase}) * 12']}
   walk['bones']['tail']={'rotation':['math.cos(query.anim_time * 290) * 4',0,0]}
  else:
   child='hoof' if i==1 else 'paw'
   for leg in range(4):walk['bones'][f'{child}_{leg}']={'rotation':[f'math.cos(query.anim_time * 380 + {0 if leg%2==0 else 180}) * -6',0,0]}
   if i==2:
    walk['bones']['tail']={'rotation':[0,'math.cos(query.anim_time * 300) * 6',0]}
    walk['bones']['tail_tuft']={'rotation':[0,'math.cos(query.anim_time * 300 - 45) * 7',0]}
  anims={'walk':walk}
  for phase in ('windup','strike'):
   base=f'creature_cast_quadruped_{phase}' if i==2 else f'creature_{phase}'
   anims[phase]=copy.deepcopy(src[f'animation.hakkai.{base}'])
  if i==1:anims['contact']=neutral_wild_contact(anims['strike'],bones,prefix,6)
  if i==2:
   anims['contact']=copy.deepcopy(anims['strike'])
   align_strike_start(anims)
  for label,anim in anims.items():
   anim['bones']={prefix+n:track for n,track in anim['bones'].items()}
   if not set(anim['bones'])<=bones:raise ValueError(f'{name}/{label} missing {set(anim["bones"])-bones}')
   tracks[f'animation.hakkai.{name}_{label}']=anim
  path=RP/f'entity/{name}.entity.json';obj=json.loads(path.read_text(encoding='utf8'));alias=obj['minecraft:client_entity']['description']['animations']
  alias['walk']=f'animation.hakkai.{name}_walk'
  for phase in ('windup','strike'):
   alias[f'creature_{phase}']=f'animation.hakkai.{name}_{phase}'
   if i==2:alias[f'talent_{phase}']=f'animation.hakkai.{name}_{phase}'
  if i in (1,2):alias['native_contact']=f'animation.hakkai.{name}_contact'
  outputs[path]=enc(obj)
 outputs[RP/'animations/sky_wild_individual.animation.json']=enc({'format_version':'1.8.0','animations':tracks})
 for path,data in outputs.items():
  if a.write:path.write_bytes(data)
  elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Sky wildlife visual sync stale: '+str(path))
 print('Sky wildlife: 3 clients and 11 remapped animations '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
