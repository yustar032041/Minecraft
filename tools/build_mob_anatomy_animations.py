#!/usr/bin/env python3
"""Generate limb variations only; never edit textures, geometry or base animations."""
import argparse
import copy
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack/animations'
source=json.loads((root/'creature_talent_attacks.animation.json').read_text(encoding='utf8'))['animations']
out=root/'creature_anatomy_attacks.animation.json'

def rotation(phase,axis,angle):
    vector=lambda n:[round(n if i==axis else 0,2) for i in range(3)]
    # Windup remains held for the existing 1.9 second animation; strike returns
    # all limb angles to zero by 0.38 seconds. Purely cosmetic, not hit timing.
    frames={'0.0':vector(0),'0.65':vector(angle*.55),'1.9':vector(angle)} if phase=='windup' else {'0.0':vector(angle*.4),'0.12':vector(-angle),'0.38':vector(0)}
    return {'rotation':frames}

animations={}
for style in ('lunge','brace','cast'):
    for anatomy in ('arms','quadruped','arachnid','wings'):
        for phase in ('windup','strike'):
            original=f'animation.hakkai.creature_{style}_{phase}'
            item=copy.deepcopy(source[original]);bones=item['bones']
            amplitude={'lunge':32,'brace':20,'cast':26}[style]
            if anatomy=='arms':
                for name,sign in [('arm_l',1),('arm_r',-1)]:bones[name]=rotation(phase,0,amplitude*sign)
            elif anatomy=='wings':
                for name,sign in [('wing_l',1),('wing_r',-1)]:bones[name]=rotation(phase,2,amplitude*sign)
            else:
                n=8 if anatomy=='arachnid' else 4
                for i in range(n):bones[f'leg_{i}']=rotation(phase,0,amplitude*(.55 if n==4 else .35)*(1 if i%2==0 else -1))
            animations[f'animation.hakkai.creature_{style}_{anatomy}_{phase}']=item
text=json.dumps({'format_version':'1.8.0','animations':animations},ensure_ascii=False,indent=2)+'\n'
parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
if args.check:
    if not out.exists() or out.read_text(encoding='utf8')!=text:raise SystemExit('Mob anatomy animations are stale')
else:out.write_text(text,encoding='utf8')
print(f'Mob anatomy animation variants: {len(animations)}; cosmetic only')
