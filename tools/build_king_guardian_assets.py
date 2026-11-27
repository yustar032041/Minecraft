#!/usr/bin/env python3
"""Build eight isolated king summons from the approved guardian rigs/textures.

Provisional implementation values are not a balance pass. These are separate
IDs and families, without normal guardian loot, XP, boss bar or challenge state.
The native timer is a fallback for unload/restart, not verified Bedrock physics.
"""
import argparse,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0'
p=argparse.ArgumentParser();g=p.add_mutually_exclusive_group(required=True);g.add_argument('--write',action='store_true');g.add_argument('--check',action='store_true');a=p.parse_args()
for realm in range(8):
 for pack,folder in [('BehaviorPack','entities'),('ResourcePack','entity')]:
  base=json.loads((root/pack/folder/(f'guardian_{realm}'+('.json' if pack=='BehaviorPack' else '.entity.json'))).read_text())
  node=base['minecraft:entity' if pack=='BehaviorPack' else 'minecraft:client_entity'];node['description']['identifier']=f'hakkai:king_guardian_{realm}'
  if pack=='BehaviorPack':
   desc=node['description'];desc['is_spawnable']=False;desc['is_summonable']=True
   c=node['components'];c['minecraft:type_family']['family']=['monster','hakkai_king_guardian']
   c['minecraft:health']={'value':40,'max':40};c.pop('minecraft:loot',None);c.pop('minecraft:experience_reward',None);c.pop('minecraft:nameable',None)
   c['minecraft:timer']={'looping':False,'time':{'min':60,'max':60},'time_down_event':{'event':'hakkai:retire','target':'self'}}
   node['component_groups']={'hakkai:expired':{'minecraft:instant_despawn':{}}}
   node['events']={'hakkai:retire':{'add':{'component_groups':['hakkai:expired']}}}
  else:node['description'].pop('spawn_egg',None)
  path=root/pack/folder/(f'king_guardian_{realm}'+('.json' if pack=='BehaviorPack' else '.entity.json'))
  text=json.dumps(base,ensure_ascii=False,indent=2)+'\n'
  if a.write:path.write_text(text)
  elif not path.exists() or path.read_text()!=text:raise SystemExit('stale: '+str(path))
print('8 isolated king guardian assets: existing texture and rig, no normal loot/XP; provisional')
