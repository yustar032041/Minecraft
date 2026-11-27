#!/usr/bin/env python3
"""Build the eight compact, distinctly tinted elemental spell particles."""
import argparse,copy,json
from pathlib import Path
RP=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack/particles'
COLORS=[[.65,1,.88,1],[.2,.65,1,1],[1,.26,.05,1],[.75,.49,.20,1],[1,.92,.20,1],[1,1,.78,1],[.62,.25,.9,1],[.95,.58,1,1]]
def outputs():
 base=json.loads((RP/'mob_wind.json').read_text())
 for i,color in enumerate(COLORS):
  j=copy.deepcopy(base);e=j['particle_effect'];e['description']['identifier']=f'hakkai:element_spell_{i}'
  c=e['components'];c['minecraft:particle_appearance_tinting']['color']=color;c['minecraft:particle_appearance_billboard']['size']=[.28,.28]
  yield RP/f'element_spell_{i}.json',(json.dumps(j,indent=2)+'\n').encode()
if __name__=='__main__':
 p=argparse.ArgumentParser();g=p.add_mutually_exclusive_group(required=True);g.add_argument('--write',action='store_true');g.add_argument('--check',action='store_true');a=p.parse_args()
 for path,data in outputs():
  if a.write:path.write_bytes(data)
  elif not path.exists() or path.read_bytes()!=data:raise SystemExit(f'particle out of date: {path}')
 print('Eight elemental particles '+('written' if a.write else 'verified')+' (static only)')
