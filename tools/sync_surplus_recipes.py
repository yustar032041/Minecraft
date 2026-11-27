#!/usr/bin/env python3
"""Generate safe, one-way surplus-material crafting alternatives.

All outputs are existing usable items, never the consumed source material.
--check fails on drift; --write refuses to overwrite unrelated recipes.
"""
import argparse
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
RECIPES=ROOT/'Hakkai_v7.1.0/BehaviorPack/recipes'

def recipe(name,inputs,output,count):
 return {'format_version':'1.21.90','minecraft:recipe_shapeless':{
  'unlock':[{'context':'AlwaysUnlocked'}],
  'description':{'identifier':'hakkai:'+name},'tags':['crafting_table'],
  'ingredients':[{'item':item} for item in inputs],
  'result':{'item':output,'count':count}}}

def recipes():
 rows={}
 for i in range(20):
  # Attribute 1 has the exact same established recipe already.
  if i==1:continue
  n=f'surplus_crystal_{i}_mana'
  rows[n]=recipe(n,['minecraft:glass_bottle','minecraft:glow_berries',f'hakkai:crystal_{i}'],'hakkai:mana_tonic',1)
 for i in range(8):
  n=f'surplus_pearl_{i}_ender'
  rows[n]=recipe(n,[f'hakkai:pearl_{i}'],'minecraft:ender_pearl',4)
  n=f'surplus_guardian_core_{i}_diamond'
  rows[n]=recipe(n,[f'hakkai:guardian_core_{i}'],'minecraft:diamond',2)
 for name,source,count in [('surplus_king_core_scrap','eclipse_core',2),('surplus_warden_core_scrap','warden_core',4)]:
  rows[name]=recipe(name,[f'hakkai:{source}','minecraft:iron_ingot'],'minecraft:netherite_scrap',count)
 return rows

def main():
 parser=argparse.ArgumentParser();group=parser.add_mutually_exclusive_group(required=True);group.add_argument('--write',action='store_true');group.add_argument('--check',action='store_true');args=parser.parse_args()
 expected=recipes();errors=[]
 for name,data in expected.items():
  p=RECIPES/(name+'.json')
  if p.exists():
   try:actual=json.loads(p.read_text(encoding='utf8'))
   except (OSError,ValueError) as exc:errors.append(f'{p}: {exc}');continue
   if actual!=data:errors.append(f'{p}: different existing recipe; refusing overwrite')
  elif args.write:p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
  else:errors.append(f'{p}: missing')
 extras={p.stem for p in RECIPES.glob('surplus_*.json')}-expected.keys()
 if extras:errors.append('unexpected surplus files: '+', '.join(sorted(extras)))
 if errors:raise SystemExit('\n'.join(errors))
 print(f'{len(expected)} one-way surplus recipes '+('written' if args.write else 'verified')+'; existing water-tonic recipe reused')
if __name__=='__main__':main()
