#!/usr/bin/env python3
"""Sync only the eight guardian detail animation aliases and derived animation.

Existing attack/walk aliases, scripts, models, behavior and textures are kept.
Animations move species-specific child bones without replacing attack motion.
"""
import argparse, copy, json
from mob_attack_joint_details import align_strike_start
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack'
OUT=ROOT/'animations/guardian_details.animation.json'
RIG_OUT=ROOT/'animations/guardian_individual_rigs.animation.json'

def make_animation(i,bone_names):
 tracks={}
 for leg in range(4):
  name=f'g{i}_shin_{leg}'
  if name not in bone_names:raise ValueError(f'Missing shin {name}')
  phase=0 if leg in (0,3) else 180
  tracks[name]={'rotation':[f'math.cos(query.anim_time * 420 + {phase}) * 9 * math.min(query.modified_move_speed * 4, 1)',0,0]}
 tail=f'g{i}_tail_detail_0'
 if tail not in bone_names:raise ValueError(f'Missing tail detail {tail}')
 tracks[tail]={'rotation':[0,f'math.sin(query.anim_time * {54+i*4}) * {2+i%3}',0]}
 if i==6:
  for side,sign in [('l',1),('r',-1)]:
   for j in (0,1):
    feather=f'g6_wing_{side}_detail_{j}'
    if feather not in bone_names:raise ValueError(f'Missing wing feather {feather}')
    tracks[feather]={'rotation':[0,0,f'math.sin(query.anim_time * 85 + {j*35}) * {sign*(2+j)}']}
 return {'loop':True,'bones':tracks}

def serialized(obj):return (json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode('utf8')
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--write',action='store_true');parser.add_argument('--check',action='store_true');args=parser.parse_args()
 if args.write==args.check:parser.error('choose exactly one of --write or --check')
 animations={};rigs={};outputs={}
 sources={}
 for file in ('beast.animation.json','creature_attacks.animation.json','creature_anatomy_attacks.animation.json'):
  sources.update(json.loads((ROOT/'animations'/file).read_text(encoding='utf8'))['animations'])
 for i in range(8):
  name=f'guardian_{i}';id=f'animation.hakkai.guardian_{i}_detail'
  geo=json.loads((ROOT/'models/entity'/f'{name}.geo.json').read_text(encoding='utf8'))['minecraft:geometry'][0]
  bone_names={b['name'] for b in geo['bones']}
  animations[id]=make_animation(i,bone_names)
  # Remap existing walk, melee and three special-attack tracks to this
  # guardian's own joints. Combat timing/values remain unchanged.
  transforms={'walk':'animation.hakkai.beast.walk',
              'windup':'animation.hakkai.creature_windup',
              'strike':'animation.hakkai.creature_strike'}
  anatomy='wings' if i==6 else 'quadruped'
  for style in ('brace','lunge','cast'):
   for phase in ('windup','strike'):
    transforms[f'{style}_{phase}']=f'animation.hakkai.creature_{style}_{anatomy}_{phase}'
  # Keep authored actions and their timing, but let the existing shin joints
  # participate in each special instead of remaining straight below a moving
  # thigh. Detail/walk animations may blend differently in the real engine.
  mapped={label:copy.deepcopy(sources[source]) for label,source in transforms.items()}
  # Native melee begins on contact, without a warned windup: start from
  # neutral, preserve the old head/body peak, and add restrained foot motion.
  contact=copy.deepcopy(mapped['strike'])
  for track in contact['bones'].values():track['rotation']['0.0']=[0,0,0]
  for leg in range(4):
   joint=f'leg_{leg}'
   if f'g{i}_{joint}' not in bone_names:raise ValueError(f'{name} missing {joint}')
   angle=-6 if leg<2 else 3
   contact['bones'][joint]={'rotation':{'0.0':[0,0,0],'0.12':[angle,0,0],'0.38':[0,0,0]}}
  if i==6:
   for side,angle in (('l',-12),('r',12)):
    joint=f'wing_{side}'
    if f'g{i}_{joint}' not in bone_names:raise ValueError(f'{name} missing {joint}')
    contact['bones'][joint]={'rotation':{'0.0':[0,0,0],'0.12':[0,0,angle],'0.38':[0,0,0]}}
  mapped['contact']=contact
  for style in ('brace','lunge','cast'):
   pair={'windup':mapped[f'{style}_windup'],'strike':mapped[f'{style}_strike']}
   align_strike_start(pair)
   for leg in range(4):
    joint=f'shin_{leg}'
    if f'g{i}_{joint}' not in bone_names:raise ValueError(f'{name} missing {joint}')
    # Small knee flexion; opposite sides counterbalance the lunge.
    angle={'brace':-4,'lunge':(-7 if leg in (0,3) else 5),'cast':-3}[style]
    end=[angle,0,0];rebound=[round(-angle*.55,2),0,0]
    pair['windup']['bones'][joint]={'rotation':{'0.0':[0,0,0],'1.9':end}}
    pair['strike']['bones'][joint]={'rotation':{'0.0':end,'0.12':rebound,'0.38':[0,0,0]}}
  for label,item in mapped.items():
   item['bones']={f'g{i}_{bone}':value for bone,value in item['bones'].items()}
   if not set(item['bones'])<=bone_names:raise ValueError(f'{name} has missing animation joints for {label}')
   rigs[f'animation.hakkai.guardian_{i}_{label}']=item
  path=ROOT/'entity'/f'{name}.entity.json';obj=json.loads(path.read_text(encoding='utf8'));desc=obj['minecraft:client_entity']['description']
  desc['animations']['guardian_detail']=id
  desc['animations']['native_contact']=f'animation.hakkai.guardian_{i}_contact'
  animate=desc.setdefault('scripts',{}).setdefault('animate',[])
  # Preserve existing order/conditions and reject conflicting previous aliases.
  if any(isinstance(x,dict) and 'guardian_detail' in x for x in animate):raise ValueError(f'{name} has conditional guardian_detail')
  if animate.count('guardian_detail')>1:raise ValueError(f'{name} has duplicate guardian_detail')
  if 'guardian_detail' not in animate:animate.append('guardian_detail')
  outputs[path]=serialized(obj)
 outputs[OUT]=serialized({'format_version':'1.8.0','animations':animations})
 outputs[RIG_OUT]=serialized({'format_version':'1.8.0','animations':rigs})
 for path,data in outputs.items():
  if args.write:path.write_bytes(data)
  elif not path.exists() or path.read_bytes()!=data:raise SystemExit(f'Guardian detail animation out of sync: {path}')
 print('Guardian joint/detail animations: 8 clients, 8 details and 80 remapped rig animations '+('written' if args.write else 'verified'))
if __name__=='__main__':main()
