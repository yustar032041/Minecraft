#!/usr/bin/env python3
"""Same-scale opaque offline guardian diagnostics, not Bedrock rendering.

Samples numeric keys only; cannot show MoLang, animation blending, engine
physics, light, normal/MER maps or damage. Writes only diagnostic PNG files.
"""
import argparse,io,json
from pathlib import Path
from PIL import Image,ImageDraw
from preview_mob_geometry import collect,render
from preview_mob_pose import posed
ROOT=Path(__file__).resolve().parents[1];RP=ROOT/'Hakkai_v7.1.0/ResourcePack';OUT=ROOT/'art_sources/guardian_previews'
def png(im):
 b=io.BytesIO();im.save(b,format='PNG');return b.getvalue()
def build():
 models=[json.loads((RP/f'models/entity/guardian_{i}.geo.json').read_text())['minecraft:geometry'][0] for i in range(8)]
 textures=[]
 for i in range(8):
  tex=Image.open(RP/f'textures/entity/guardian_{i}.png').convert('RGBA');tex.putalpha(255);textures.append(tex)
 rig=json.loads((RP/'animations/guardian_individual_rigs.animation.json').read_text())['animations']
 poses=[[posed(models[i],rig[f'animation.hakkai.guardian_{i}_lunge_{phase}'],t) for phase,t in [('windup',1.9),('strike',.12)]] for i in range(8)]
 frame=[v for model in models for quad,_ in collect(model) for v in quad];poseframe=[v for entries in poses for model in entries for quad,_ in collect(model) for v in quad]
 fronts=Image.new('RGB',(320*4,320*2),(32,36,42));grid=Image.new('RGB',(320*4,320*4),(32,36,42));result={}
 for i in range(8):
  pic=render(models[i],textures[i],320,framing=frame,depth_buffer=True);result[OUT/f'guardian_{i}.png']=png(pic)
  x=(i%4)*320;y=(i//4)*320;fronts.paste(pic.crop((0,0,320,320)),(x,y));d=ImageDraw.Draw(fronts);d.rectangle((x,y,x+150,y+26),fill=(32,36,42));d.text((x+8,y+8),f'guardian_{i}',fill=(240,240,240))
  for j,model in enumerate(poses[i]):
   pic=render(model,textures[i],320,framing=poseframe,depth_buffer=True);x=(i%4)*320;y=((i//4)*2+j)*320;grid.paste(pic.crop((0,0,320,320)),(x,y))
   d=ImageDraw.Draw(grid);d.rectangle((x,y,x+180,y+26),fill=(32,36,42));d.text((x+8,y+8),f'guardian_{i} '+('windup' if not j else 'strike'),fill=(240,240,240))
 result[OUT/'comparison.png']=png(fronts);result[OUT/'poses.png']=png(grid);return result

def main():
 p=argparse.ArgumentParser(description=__doc__);g=p.add_mutually_exclusive_group(required=True);g.add_argument('--write',action='store_true');g.add_argument('--check',action='store_true');a=p.parse_args()
 for path,data in build().items():
  if a.write:path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
  elif not path.exists() or path.read_bytes()!=data:raise SystemExit(f'Guardian preview stale: {path}')
 print('Guardian same-scale static/pose diagnostics '+('written' if a.write else 'verified')+' (not Bedrock renders)')
if __name__=='__main__':main()
