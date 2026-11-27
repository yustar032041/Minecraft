#!/usr/bin/env python3
"""Generate source-centred telegraph particles from approved existing sprites.

These are fixed world-space marks, not attached to the entity; Bedrock rendering
and multiplayer visibility must be checked separately. No texture changes.
"""
import argparse,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack/particles'
parser=argparse.ArgumentParser();parser.add_argument('--write',action='store_true');parser.add_argument('--check',action='store_true');args=parser.parse_args()
if args.write==args.check:parser.error('choose --write or --check')
for color in ('impact','spore','frost','spark','shadow','sand','wind','time','ward'):
 obj=json.loads((root/f'mob_{color}.json').read_text())
 effect=obj['particle_effect'];effect['description']['identifier']=f'hakkai:tell_{color}'
 components=effect['components']
 # A fixed particle cannot follow a moving entity. Keep the initial flash
 # short so it doesn't leave a misleading two-second phantom behind.
 components['minecraft:particle_lifetime_expression']['max_lifetime']=0.6
 components['minecraft:particle_appearance_billboard']['size']=[.32,.32]
 data=json.dumps(obj,ensure_ascii=False,indent=2)+'\n';target=root/f'tell_{color}.json'
 if args.write:target.write_text(data)
 elif not target.exists() or target.read_text()!=data:raise SystemExit(f'stale: {target}')
print('9 enemy tell particles: approved existing sprites, 0.6 second duration')
