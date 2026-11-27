#!/usr/bin/env python3
"""Apply the reviewed raise-only durability policy, preserving other fields.

The policy records old and new values to make this operation idempotent.
Repair amounts are updated separately by sync_equipment_repairs.py.
"""
import argparse,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];ITEMS=ROOT/'Hakkai_v7.1.0/BehaviorPack/items';POLICY=ROOT/'tools/equipment_durability_policy.json'
def main():
 ap=argparse.ArgumentParser();g=ap.add_mutually_exclusive_group(required=True);g.add_argument('--write',action='store_true');g.add_argument('--check',action='store_true');a=ap.parse_args()
 rows=json.loads(POLICY.read_text());assert len(rows)==250 and len({x['id'] for x in rows})==250
 pending={}
 for row in rows:
  p=ITEMS/(row['id']+'.json');raw=p.read_bytes().decode();c=json.loads(raw)['minecraft:item']['components'];actual=c['minecraft:durability']['max_durability']
  assert row['new']==row['old']*2 and actual in (row['old'],row['new']),row['id']
  new,n=re.subn(r'("max_durability"\s*:\s*)\d+',lambda m:m[1]+str(row['new']),raw);assert n==1;pending[p]=new.encode()
 changed=[p for p,s in pending.items() if p.read_bytes()!=s]
 if a.check and changed:raise SystemExit('durability stale: '+', '.join(str(x) for x in changed))
 if a.write:
  for p in changed:p.write_bytes(pending[p])
 print(f'{len(rows)} equipment durability values checked; {len(changed)} pending or updated')
if __name__=='__main__':main()
