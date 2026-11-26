#!/usr/bin/env python3
"""Remap existing walk and attack tracks to three underground wildlife rigs.

Existing animations plus minor joint motion are provisional; AI and combat
are not changed by this visual synchronizer.
"""
import argparse,copy,json
from mob_attack_joint_details import align_strike_start, neutral_wild_contact
from pathlib import Path
RP=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack'
def enc(x):return (json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode()
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 source={}
 for f in ('wild.animation.json','creature_attacks.animation.json','creature_anatomy_attacks.animation.json'):
  source.update(json.loads((RP/'animations'/f).read_text())['animations'])
 outputs={};tracks={}
 for i,walkname in enumerate(('frog','bug','spider')):
  name=f'wild_5_{i}';prefix=f'w5_{i}_';bones={b['name'] for b in json.loads((RP/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0]['bones']}
  walk=copy.deepcopy(source[f'animation.hakkai.{walkname}.stride'])
  count=(4,6,8)[i];child=('foot','foot','shin')[i]
  for leg in range(count):
   walk['bones'][f'{child}_{leg}']={'rotation':[f'math.cos(query.anim_time * 380 + {0 if leg%2==0 else 180}) * -6',0,0]}
  if i==1:
   for side,phase in (('l',0),('r',180)):
    walk['bones'][f'antenna_{side}']={'rotation':[f'math.cos(query.anim_time * 280 + {phase}) * 6',0,0]}
  anims={'walk':walk}
  for phase in ('windup','strike'):
   base=f'creature_cast_arachnid_{phase}' if i==2 else f'creature_{phase}'
   anims[phase]=copy.deepcopy(source[f'animation.hakkai.{base}'])
  if i==1:anims['contact']=neutral_wild_contact(anims['strike'],bones,prefix,5)
  if i==2:
   anims['contact']=copy.deepcopy(anims['strike'])
   align_strike_start(anims)
  for label,anim in anims.items():
   anim['bones']={prefix+n:track for n,track in anim['bones'].items()}
   if not set(anim['bones'])<=bones:raise ValueError(f'{name} {label}: missing {set(anim["bones"])-bones}')
   tracks[f'animation.hakkai.{name}_{label}']=anim
  path=RP/f'entity/{name}.entity.json';obj=json.loads(path.read_text(encoding='utf8'));alias=obj['minecraft:client_entity']['description']['animations']
  alias['walk']=f'animation.hakkai.{name}_walk'
  for phase in ('windup','strike'):
   alias[f'creature_{phase}']=f'animation.hakkai.{name}_{phase}'
   if i==2:alias[f'talent_{phase}']=f'animation.hakkai.{name}_{phase}'
  if i in (1,2):alias['native_contact']=f'animation.hakkai.{name}_contact'
  outputs[path]=enc(obj)
 outputs[RP/'animations/underworld_wild_individual.animation.json']=enc({'format_version':'1.8.0','animations':tracks})
 for path,data in outputs.items():
  if a.write:path.write_bytes(data)
  elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Underground wildlife visual sync stale: '+str(path))
 print('Underground wildlife: 3 clients and 11 remapped animations '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
