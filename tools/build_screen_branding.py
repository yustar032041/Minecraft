#!/usr/bin/env python3
"""Reproduce UI images from AI-generated source art. Needs Pillow, numpy, scipy.

The model drew a checkerboard rather than returning an alpha channel; flood-fill
only near-neutral bright pixels connected to the border, preserving logo details.
"""
import argparse
from io import BytesIO
from pathlib import Path
import numpy as np
from scipy.ndimage import binary_propagation
from PIL import Image,ImageFilter
root=Path(__file__).resolve().parents[1]
art=root/'art_sources/title'
dest=root/'Hakkai_v7.1.0/ResourcePack/textures/ui'

def files():
 im=Image.open(art/'eight_realms_logo.png').convert('RGB')
 a=np.asarray(im);candidate=(a.min(axis=2)>212)&((a.max(axis=2).astype(int)-a.min(axis=2))<17)
 seed=np.zeros(candidate.shape,dtype=bool);seed[0,:]=True;seed[-1,:]=True;seed[:,0]=True;seed[:,-1]=True
 bg=binary_propagation(seed,mask=candidate)
 rgba=im.convert('RGBA');alpha=Image.fromarray((~bg).astype('uint8')*255).filter(ImageFilter.GaussianBlur(.55))
 rgba.putalpha(alpha);rgba=rgba.crop(alpha.getbbox());rgba.thumbnail((1020,190),Image.Resampling.LANCZOS)
 canvas=Image.new('RGBA',(1024,194));canvas.alpha_composite(rgba,((1024-rgba.width)//2,(194-rgba.height)//2))
 background=Image.open(art/'loading_background.png').convert('RGB').resize((256,256),Image.Resampling.LANCZOS)
 for name,img in [('title.png',canvas),('hakkai_loading_background.png',background)]:
  b=BytesIO();img.save(b,format='PNG',optimize=True);yield dest/name,b.getvalue()
if __name__=='__main__':
 parser=argparse.ArgumentParser();mode=parser.add_mutually_exclusive_group(required=True);mode.add_argument('--write',action='store_true');mode.add_argument('--check',action='store_true');args=parser.parse_args()
 for path,data in files():
  if args.write:path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
  elif not path.exists() or path.read_bytes()!=data:raise SystemExit(f'out of date: {path}')
 print('Screen branding images '+('written' if args.write else 'verified')+'; rendered UI not tested')
