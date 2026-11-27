#!/usr/bin/env python3
"""Apply reviewed raise-only corrections to native hostile health and damage.

--check validates all 104 entities and their ordered realm-role baselines.
The edited health/damage only affect native entity definitions; script attacks
are scaled separately in realm_balance.js. No claim about actual Bedrock TTK.
"""
import argparse,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ENTITIES=ROOT/'Hakkai_v7.1.0/BehaviorPack/entities'
POLICY=ROOT/'tools/realm_entity_progression_policy.json'

def main():
 ap=argparse.ArgumentParser();group=ap.add_mutually_exclusive_group(required=True)
 group.add_argument('--write',action='store_true');group.add_argument('--check',action='store_true');args=ap.parse_args()
 rows=json.loads(POLICY.read_text(encoding='utf8'));by={x['id']:x for x in rows}
 if len(by)!=len(rows):raise ValueError('duplicate policy')
 pending={};stats={}
 for kind,index in [*(('foe',i) for i in range(12)),('wild',2)]:
  prevh=prevd=0
  for realm in range(8):
   ident=f'{kind}_{realm}_{index}';path=ENTITIES/(ident+'.json');raw=path.read_bytes().decode('utf8');entity=json.loads(raw)['minecraft:entity']
   if entity['description']['identifier']!='hakkai:'+ident:raise ValueError(ident+' mismatch')
   c=entity['components'];health=c['minecraft:health'];damage=c['minecraft:attack']['damage'];old={'health':health['value'],'damage':damage}
   if health['value']!=health['max']:raise ValueError(ident+' nonmatching health')
   row=by.get(ident);new=row['new'] if row else old
   if row and old not in (row['old'],new):raise ValueError(ident+' unexpected values')
   if row and any(new[k]<row['old'][k] for k in new):raise ValueError(ident+' reduction')
   if realm and (new['health']<=prevh or new['damage']<prevd):raise ValueError(ident+' progression regression')
   prevh,prevd=new['health'],new['damage'];stats[ident]=new
   if row:
    raw,n=re.subn(r'("minecraft:health"\s*:\s*\{\s*"value"\s*:\s*)\d+(\s*,\s*"max"\s*:\s*)\d+',lambda m:m[1]+str(new['health'])+m[2]+str(new['health']),raw);assert n==1
    raw,n=re.subn(r'("minecraft:attack"\s*:\s*\{\s*"damage"\s*:\s*)\d+',lambda m:m[1]+str(new['damage']),raw);assert n==1
    pending[path]=raw.encode('utf8')
 if not set(by)<=set(stats):raise ValueError('unknown policy id')
 changed=[p for p,v in pending.items() if p.read_bytes()!=v]
 if args.check and changed:raise SystemExit('entity progression out of date: '+', '.join(p.name for p in changed))
 if args.write:
  for p in changed:p.write_bytes(pending[p])
 print(f'{len(stats)} hostile native profiles verified; {len(changed)} files '+('updated' if args.write else 'need updates'))
if __name__=='__main__':main()
