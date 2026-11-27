#!/usr/bin/env python3
"""Isolate the reviewed endgame pickaxe artwork and regenerate its PBR maps.

Only the pickaxe icon and its maps are touched. The rest of the approved item
art, all item/recipe definitions and vanilla animated dials are left alone.
"""
import argparse,collections,sys
from pathlib import Path
from PIL import Image,ImageFilter
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from import_item_art import save_with_maps
SOURCE=ROOT/'art_sources/ultimate_pickaxe_revision.png'
OUT=ROOT/'Hakkai_v7.1.0/ResourcePack/textures/items/hakkai_ult_pickaxe.png'
def render():
 image=Image.open(SOURCE).convert('RGB');w,h=image.size;pix=image.load();mask=Image.new('L',(w,h),255);mp=mask.load();q=collections.deque()
 def add(x,y):
  if mp[x,y] and min(pix[x,y])>=245:mp[x,y]=0;q.append((x,y))
 for x in range(w):add(x,0);add(x,h-1)
 for y in range(h):add(0,y);add(w-1,y)
 while q:
  x,y=q.popleft()
  for xx,yy in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
   if 0<=xx<w and 0<=yy<h:add(xx,yy)
 image.putalpha(mask.filter(ImageFilter.GaussianBlur(.45)));image.thumbnail((128,128),Image.Resampling.LANCZOS)
 result=Image.new('RGBA',(128,128),(0,0,0,0));result.alpha_composite(image,((128-image.width)//2,(128-image.height)//2))
 return result
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--write',action='store_true');a=ap.parse_args()
 if not a.write:raise SystemExit('Pass --write to regenerate the approved pickaxe icon')
 save_with_maps(render(),OUT);print('Final Hour pickaxe artwork and PBR maps updated')
