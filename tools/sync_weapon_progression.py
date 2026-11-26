#!/usr/bin/env python3
"""Keep ranked weapon damage/durability in sync with the balance policy.

Policy preserves recorded old values for review, and only raises affected
stats; --check verifies the catalog, item data and every previous-rank link.
"""
import argparse,json,re
from pathlib import Path
from organize_weapons import KINDS
ROOT=Path(__file__).resolve().parents[1];BP=ROOT/'Hakkai_v7.1.0/BehaviorPack';POLICY=ROOT/'tools/weapon_progression_policy.json'
def main():
 p=argparse.ArgumentParser();g=p.add_mutually_exclusive_group(required=True);g.add_argument('--write',action='store_true');g.add_argument('--check',action='store_true');a=p.parse_args()
 path=BP/'scripts/data.js';raw=path.read_bytes().decode();m=re.search(r'^export const catalog=(\[.*\]);\r?$',raw,re.M);assert m
 catalog=json.loads(m[1]);weapons=[x for x in catalog if x['kind'] in KINDS];by={x['id']:x for x in weapons};policy=json.loads(POLICY.read_text());assert len(by)==141
 for row in policy:
  x=by[row['id']];x['damage']=row['new']['damage']
  f=BP/'items'/f"{row['id']}.json";data=json.loads(f.read_bytes());c=data['minecraft:item']['components'];c['minecraft:damage']=row['new']['damage'];c['minecraft:durability']['max_durability']=row['new']['durability']
  if a.write:
   # Preserve pre-existing CRLF item files.
   f.write_bytes((json.dumps(data,ensure_ascii=False,indent=2)+'\n').replace('\n','\r\n').encode())
  else:
   actual=json.loads(f.read_bytes())['minecraft:item']['components'];assert actual['minecraft:damage']==row['new']['damage'] and actual['minecraft:durability']['max_durability']==row['new']['durability'],row['id']
 newraw=raw[:m.start(1)]+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+raw[m.end(1):]
 if a.write:path.write_bytes(newraw.encode())
 else:assert raw==newraw,'weapon catalog out of sync'
 for x in weapons:
  file=BP/'items'/f"{x['id']}.json";c=json.loads(file.read_bytes())['minecraft:item']['components']
  assert c['minecraft:damage']==x['damage'],x['id']
  if x['prev']:
   prev=by[x['prev']];pc=json.loads((BP/'items'/f"{prev['id']}.json").read_bytes())['minecraft:item']['components']
   assert x['damage']>=prev['damage']+2,(x['id'],'damage')
   assert c['minecraft:durability']['max_durability']>=pc['minecraft:durability']['max_durability']+14,(x['id'],'durability')
 print(f'141 weapons/tools and {len(policy)} adjusted progression entries '+('written' if a.write else 'verified')+' (static only)')
if __name__=='__main__':main()
