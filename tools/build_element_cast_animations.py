#!/usr/bin/env python3
"""Generate eight differentiated player casting motions. No gameplay changes."""
import argparse,json
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack/animations/element_cast.animation.json'
POSES=[([-65,0,38],[-28,0,-30],[0,-18,0]),([-50,20,30],[-68,-20,-30],[-8,0,0]),([-105,0,18],[-30,0,-20],[5,14,0]),([-48,0,68],[-48,0,-68],[12,0,0]),([-115,-15,8],[-25,0,-18],[0,-20,0]),([-78,0,42],[-78,0,-42],[-8,0,0]),([-70,-28,18],[-45,25,-18],[0,22,0]),([-82,20,30],[-55,-20,-36],[0,-12,0])]
def data():
 anim={}
 for i,(right,left,body) in enumerate(POSES):
  bones={}
  for bone,peak in [('rightarm',right),('leftarm',left),('body',body)]:bones[bone]={'rotation':{'0.0':[0,0,0],'0.18':peak,'0.45':[0,0,0]}}
  anim[f'animation.hakkai.element_cast_{i}']={'animation_length':.45,'bones':bones}
 return (json.dumps({'format_version':'1.8.0','animations':anim},indent=2)+'\n').encode()
if __name__=='__main__':
 p=argparse.ArgumentParser();g=p.add_mutually_exclusive_group(required=True);g.add_argument('--write',action='store_true');g.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write:OUT.write_bytes(data())
 elif not OUT.exists() or OUT.read_bytes()!=data():raise SystemExit('element cast animations out of date')
 print('Eight distinct elemental casting poses '+('written' if a.write else 'verified')+' (static only)')
