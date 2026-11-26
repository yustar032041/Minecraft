#!/usr/bin/env python3
"""Render an approximate numeric keyframed pose, not a Bedrock animation player.

Samples only simple Euler rotation keyframes and linear interpolation; ignores
all positions, scale, interpolation modes, MoLang, blend layers, animation
controllers and Bedrock transform semantics. Use to spot obvious pose problems
only. Writes outside the resource pack, Pillow required.
"""
import argparse,copy,json
from pathlib import Path
from PIL import Image
from preview_mob_geometry import RP,render

def sample(track,t):
 if isinstance(track,list):return track if all(isinstance(x,(int,float)) for x in track) else None
 if not isinstance(track,dict):return None
 try:
  keys=sorted((float(k),v) for k,v in track.items())
  if any(not isinstance(v,list) or len(v)!=3 or not all(isinstance(x,(int,float)) for x in v) for _,v in keys):return None
  if t<=keys[0][0]:return keys[0][1]
  if t>=keys[-1][0]:return keys[-1][1]
  for (a,x),(b,y) in zip(keys,keys[1:]):
   if a<=t<=b:return [x[j]+(y[j]-x[j])*(t-a)/(b-a) for j in range(3)]
 except (ValueError,TypeError,IndexError):return None
 return None

def posed(model,animation,t):
 model=copy.deepcopy(model);bones={b['name']:b for b in model['bones']}
 for name,track in animation['bones'].items():
  if name not in bones:raise ValueError('missing bone '+name)
  if 'rotation' not in track:continue
  values=sample(track['rotation'],t)
  if values is None:raise ValueError('unsupported rotation '+name)
  base=bones[name].get('rotation',[0,0,0]);bones[name]['rotation']=[base[i]+values[i] for i in range(3)]
 return model

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('entity');p.add_argument('animation_file',type=Path);p.add_argument('animation_id');p.add_argument('time',type=float);p.add_argument('--output',required=True,type=Path);p.add_argument('--panel',type=int,default=240);p.add_argument('--texture',type=Path,help='override texture path when its filename differs from the entity');a=p.parse_args()
 target=a.output.resolve()
 if target.is_relative_to(RP.resolve()):p.error('output must be outside resource pack')
 model=json.loads((RP/f'models/entity/{a.entity}.geo.json').read_text())['minecraft:geometry'][0]
 tex=Image.open(a.texture or RP/f'textures/entity/{a.entity}.png').convert('RGBA')
 animation=json.loads(a.animation_file.read_text())['animations'][a.animation_id]
 target.parent.mkdir(parents=True,exist_ok=True);render(posed(model,animation,a.time),tex,a.panel).save(target)
 print(f'Approximate static sample only: {target}')
if __name__=='__main__':main()
