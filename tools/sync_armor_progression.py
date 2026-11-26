#!/usr/bin/env python3
"""Apply the reviewed, raise-only repair for the 11 ordinary armor sets.

Only the 44 listed wearables and their corresponding catalog defense labels
are updated. Skill-defense values remain at their original numbers via the
catalog's skillDefense field. This does not prove Bedrock's armor cap or balance.
"""
import argparse,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BP=ROOT/'Hakkai_v7.1.0/BehaviorPack'
POLICY=ROOT/'tools/armor_progression_policy.json'

def changed_files():
 rows=json.loads(POLICY.read_text(encoding='utf8'))
 if len(rows)!=44 or len({r['id'] for r in rows})!=44:raise ValueError('invalid armor policy')
 pending={};gear={}
 for row in rows:
  path=BP/'items'/f"{row['id']}.json";raw=path.read_bytes().decode('utf8')
  item=json.loads(raw)['minecraft:item'];c=item['components'];wear=c['minecraft:wearable'];old=row['old'];new=row['new']
  if item['description']['identifier']!='hakkai:'+row['id'] or wear['slot']!='slot.armor.'+row['slot']:raise ValueError(row['id']+' identity or slot changed')
  if any(new[k]<old[k] for k in ('protection','durability')):raise ValueError(row['id']+' would weaken stats')
  if wear['protection'] not in (old['protection'],new['protection']) or c['minecraft:durability']['max_durability'] not in (old['durability'],new['durability']):raise ValueError(row['id']+' unexpected existing stats')
  raw,n=re.subn(r'("protection"\s*:\s*)\d+',lambda m:m[1]+str(new['protection']),raw);assert n==1,row['id']
  raw,n=re.subn(r'("max_durability"\s*:\s*)\d+',lambda m:m[1]+str(new['durability']),raw);assert n==1,row['id']
  pending[path]=raw
  if row['id'].startswith('gear_'):gear[row['id']]=row
 p=BP/'scripts/data.js';text=p.read_bytes().decode('utf8');match=re.search(r'^export const catalog=(\[.*\]);\r?$',text,re.M)
 if not match:raise ValueError('catalog not found')
 catalog=json.loads(match[1]);found=set()
 for g in catalog:
  row=gear.get(g['id'])
  if row is None:continue
  if g['id'] in found:raise ValueError('duplicate catalog gear '+g['id'])
  found.add(g['id']);old=row['old']['protection'];new=row['new']['protection']
  if g['defense'] not in (old,new):raise ValueError('unexpected catalog defense '+g['id'])
  if old!=new:
   if 'skillDefense' in g and g['skillDefense']!=old:raise ValueError('unexpected original skill defense '+g['id'])
   g['skillDefense']=old
  g['defense']=new
 if found!=set(gear):raise ValueError('missing catalog gear')
 pending[p]=text[:match.start(1)]+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+text[match.end(1):]
 return pending

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--write',action='store_true');ap.add_argument('--check',action='store_true');args=ap.parse_args()
 if args.write==args.check:ap.error('choose --write or --check')
 pending=changed_files() # validate *all* inputs before writing any
 differing=[p for p,s in pending.items() if p.read_bytes()!=s.encode('utf8')]
 if args.check:
  if differing:raise SystemExit('armor progression out of date: '+', '.join(str(p.relative_to(ROOT)) for p in differing))
  print(f'44 ordinary armor definitions and catalog synchronized ({len(pending)} files checked)')
 else:
  for p in differing:p.write_bytes(pending[p].encode('utf8'))
  print(f'updated {len(differing)} files from reviewed raise-only armor policy')
if __name__=='__main__':main()
