#!/usr/bin/env python3
"""Regenerate static, same-scale traveler comparisons (NOT Bedrock renders).

Only numeric pose keys and opaque cuboids are approximated. Walk/pose blend,
MoLang, actual material/PBR shading, lighting, collision and physics differ.
The depth buffer assumes opaque faces; the atlas outside face gutters is unused.
"""
import argparse,io,json
from pathlib import Path
from PIL import Image,ImageDraw
from preview_mob_geometry import render,collect
from preview_mob_pose import posed
ROOT=Path(__file__).resolve().parents[1]
RP=ROOT/'Hakkai_v7.1.0/ResourcePack';OUT=ROOT/'art_sources/realm_traveler_previews'

def png(image):
 out=io.BytesIO();image.save(out,format='PNG');return out.getvalue()
def build():
 models=[json.loads((RP/f'models/entity/ender_{i}.geo.json').read_text())['minecraft:geometry'][0] for i in range(8)]
 textures=[]
 for i in range(8):
  tex=Image.open(RP/f'textures/entity/hakkai_ender_r{i}.png').convert('RGBA');tex.putalpha(255);textures.append(tex)
 rig=json.loads((RP/'animations/realm_traveler_individual.animation.json').read_text())['animations']
 poses=[[posed(models[i],rig[f'animation.hakkai.ender_{i}_{phase}'],t) for phase,t in [('windup',1.9),('strike',.12)]] for i in range(8)]
 frame=[v for model in models for quad,_ in collect(model) for v in quad]
 poseframe=[v for entries in poses for model in entries for quad,_ in collect(model) for v in quad]
 fronts=Image.new('RGB',(320*4,320*2),(32,36,42));grid=Image.new('RGB',(320*4,320*4),(32,36,42));result={}
 for i in range(8):
  pic=render(models[i],textures[i],320,framing=frame,depth_buffer=True)
  result[OUT/f'ender{i}_new.png']=png(pic)
  tile=pic.crop((0,320,320,640));x=(i%4)*320;y=(i//4)*320;fronts.paste(tile,(x,y));
  # Remove the preview's front label before writing the readable item label.
  d=ImageDraw.Draw(fronts);d.rectangle((x,y,x+140,y+26),fill=(32,36,42));d.text((x+8,y+8),f'ender_{i}  front',fill=(240,240,240))
  for j,model in enumerate(poses[i]):
   pic=render(model,textures[i],320,framing=poseframe,depth_buffer=True)
   x=(i%4)*320;y=((i//4)*2+j)*320;grid.paste(pic.crop((0,320,320,640)),(x,y))
   d=ImageDraw.Draw(grid);d.rectangle((x,y,x+175,y+26),fill=(32,36,42));d.text((x+8,y+8),f'ender_{i}  '+('windup' if not j else 'strike'),fill=(240,240,240))
 result[OUT/'fronts.png']=png(fronts);result[OUT/'poses.png']=png(grid)
 return result

def main():
 parser=argparse.ArgumentParser(description=__doc__);group=parser.add_mutually_exclusive_group(required=True);group.add_argument('--write',action='store_true');group.add_argument('--check',action='store_true');args=parser.parse_args()
 for path,data in build().items():
  if args.write:path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
  elif not path.exists() or path.read_bytes()!=data:raise SystemExit(f'Traveler preview stale: {path}')
 print('Traveler same-scale static/pose diagnostics '+('written' if args.write else 'verified')+' (not Bedrock renders)')
if __name__=='__main__':main()
