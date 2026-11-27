#!/usr/bin/env python3
"""Build brief moving-shot particles from existing approved sprite assets."""
import argparse,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack/particles'
p=argparse.ArgumentParser();g=p.add_mutually_exclusive_group(required=True);g.add_argument('--write',action='store_true');g.add_argument('--check',action='store_true');args=p.parse_args()
for color in ('impact','spore','frost','spark','shadow','sand','wind','time'):
 obj=json.loads((root/f'mob_{color}.json').read_text())
 effect=obj['particle_effect'];effect['description']['identifier']=f'hakkai:shot_{color}'
 components=effect['components']
 components['minecraft:particle_lifetime_expression']['max_lifetime']=0.1
 components['minecraft:particle_appearance_billboard']['size']=[.4,.4]
 data=json.dumps(obj,ensure_ascii=False,indent=2)+'\n';target=root/f'shot_{color}.json'
 if args.write:target.write_text(data)
 elif not target.exists() or target.read_text()!=data:raise SystemExit(f'stale: {target}')
print('8 moving-shot particles: existing sprites, 0.1 second lifetime')
