#!/usr/bin/env python3
"""Non-destructive FUSHI walk motion and chief crown attachment.
Preserves texture bytes, geometry cubes/UVs, behavior and combat mechanics.
Actual Bedrock blending/rendering are not established by these static checks.
"""
import argparse,json
from pathlib import Path
RP=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack'
def encoded(obj):return (json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode('utf8')
def outputs():
 paths={}
 geo=RP/'models/entity/fushi_chief.geo.json';g=json.loads(geo.read_text(encoding='utf8'))
 bones=g['minecraft:geometry'][0]['bones'];crown=next(b for b in bones if b['name']=='crown');crown['parent']='head';paths[geo]=encoded(g)
 anim=RP/'animations/fushi.animation.json';a=json.loads(anim.read_text(encoding='utf8'))
 a['animations']['animation.hakkai.fushi.walk']={
  'loop':True,'animation_length':.5,'bones':{
   'body':{'rotation':[0,0,'math.sin(query.anim_time * 720) * 3'],
           'position':[0,'math.abs(math.sin(query.anim_time * 720)) * 0.35',0]},
   'head':{'rotation':[0,0,'math.sin(query.anim_time * 720) * -2']}}}
 paths[anim]=encoded(a)
 for name in ('fushi','fushi_chief'):
  path=RP/f'entity/{name}.entity.json';c=json.loads(path.read_text(encoding='utf8'));desc=c['minecraft:client_entity']['description']
  desc['animations']['walk']='animation.hakkai.fushi.walk'
  animate=desc['scripts']['animate'];animate[:]=[x for x in animate if not (isinstance(x,dict) and 'walk' in x)]
  animate.append({'walk':'query.modified_move_speed > 0.01'});paths[path]=encoded(c)
 return paths
if __name__=='__main__':
 p=argparse.ArgumentParser();g=p.add_mutually_exclusive_group(required=True);g.add_argument('--write',action='store_true');g.add_argument('--check',action='store_true');args=p.parse_args()
 for path,data in outputs().items():
  if args.write:path.write_bytes(data)
  elif path.read_bytes()!=data:raise SystemExit(f'FUSHI movement stale: {path}')
 print('FUSHI and chief walk, head-attached crown: '+('written' if args.write else 'verified')+' (static only)')
