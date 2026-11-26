#!/usr/bin/env python3
"""Build the eight realm / four time-of-day distance fog definitions."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'Hakkai_v7.1.0/ResourcePack/fogs'
# Each column is intentionally realm-specific; these are distance fog colors,
# not a replacement for the sky, directional light or block textures.
COLORS = [
 ['#E4BDA5','#DAE0BA','#BB91A4','#4F6681'],
 ['#9DB9A8','#A3C6AD','#7D9293','#304E57'],
 ['#E8B48B','#E6C99D','#C67E72','#63546D'],
 ['#E0C7D8','#CCE4ED','#9FACC9','#485E80'],
 ['#BDACB2','#B6BEC9','#A68AA7','#414B6A'],
 ['#7A788C','#667886','#625F7C','#323B59'],
 ['#F0C7BD','#D8E8F2','#C8A6C8','#566A9B'],
 ['#D6AA90','#C9BDA6','#B38491','#514C70'],
]
PHASES = ('morning','day','evening','night')

def outputs():
 for realm, colors in enumerate(COLORS):
  base = json.loads((ROOT / f'realm_{realm}.json').read_text(encoding='utf8'))
  for phase, color in zip(PHASES, colors):
   fog = json.loads(json.dumps(base))
   settings = fog['minecraft:fog_settings']
   settings['description']['identifier'] = f'hakkai:realm_ambient_{realm}_{phase}'
   settings['distance']['air']['fog_color'] = color
   yield ROOT / f'realm_ambient_{realm}_{phase}.json', json.dumps(fog, ensure_ascii=False, indent=2)+'\n'

if __name__ == '__main__':
 import argparse
 parser=argparse.ArgumentParser()
 parser.add_argument('--check',action='store_true')
 args=parser.parse_args()
 for path,content in outputs():
  if args.check:
   if not path.exists() or path.read_text(encoding='utf8')!=content: raise SystemExit(f'out of date: {path}')
  else: path.write_text(content,encoding='utf8')
