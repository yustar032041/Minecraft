#!/usr/bin/env python3
"""Synchronize reviewed normal-guardian HP; never touch king summons or art."""
import argparse,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];DIRECTORY=ROOT/'Hakkai_v7.1.0/BehaviorPack/entities'
VALUES=[800,850,900,1200,1300,1400,1500,1600]
OLD=[192,200,208,216,224,232,240,248]
PREVIOUS=[600,680,760,840,920,1000,1080,1160]
def main():
 p=argparse.ArgumentParser();g=p.add_mutually_exclusive_group(required=True);g.add_argument('--write',action='store_true');g.add_argument('--check',action='store_true');args=p.parse_args();pending={}
 for i,(old,previous,new) in enumerate(zip(OLD,PREVIOUS,VALUES)):
  f=DIRECTORY/f'guardian_{i}.json';raw=f.read_bytes().decode('utf8');data=json.loads(raw)['minecraft:entity'];assert data['description']['identifier']==f'hakkai:guardian_{i}'
  hp=data['components']['minecraft:health'];assert hp['value']==hp['max'] and hp['value'] in (old,previous,new),f
  s,n=re.subn(r'("minecraft:health"\s*:\s*\{\s*"value"\s*:\s*)\d+(\s*,\s*"max"\s*:\s*)\d+',lambda m:m[1]+str(new)+m[2]+str(new),raw);assert n==1;pending[f]=s.encode()
 changed=[f for f,v in pending.items() if f.read_bytes()!=v]
 if args.check and changed:raise SystemExit('guardian balance out of date: '+', '.join(f.name for f in changed))
 if args.write:
  for f in changed:f.write_bytes(pending[f])
 print(f'8 normal guardian health values checked, {len(changed)} updated or pending; no shadow or art changes')
if __name__=='__main__':main()
