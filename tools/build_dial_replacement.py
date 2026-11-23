#!/usr/bin/env python3
"""Create optional original dial artwork in native Bedrock strip dimensions.

Frame order is based on Bedrock 1.26.60.5 sample texture layout; in-game dial
orientation, time calibration, pack stacking and rendering require device QA.
This does not contain or redistribute Mojang artwork.
"""
import argparse,io,json,math,zipfile
from pathlib import Path
from PIL import Image,ImageDraw
MANIFEST={'format_version':2,'header':{'name':'8界風記｜時計とコンパス代替画像（試験）',
 'description':'表示不具合の調査用。時計とコンパス類の画像を独自デザインに差し替えます。針と時刻は実機未確認。',
 'uuid':'14159321-1d3d-4985-b122-60d6d3f8c2d2','version':[1,0,0],'min_engine_version':[1,26,60]},
 'modules':[{'type':'resources','uuid':'f62ecc33-dd10-4f3b-9144-17c2c0304bdf','version':[1,0,0]}]}

def compass(frame,kind):
 im=Image.new('RGBA',(16,16));d=ImageDraw.Draw(im)
 recovery=kind=='recovery';lodestone=kind=='lodestone'
 edge=(19,39,45,255) if recovery else (42,44,49,255)
 rim=(43,195,190,255) if recovery else ((116,142,169,255) if lodestone else (193,202,210,255))
 bg=(12,43,49,255) if recovery else (35,40,45,255)
 d.ellipse((1,1,14,14),fill=edge);d.ellipse((2,2,13,13),fill=rim);d.ellipse((4,4,11,11),fill=bg)
 angle=math.pi/2+2*math.pi*frame/32;dx=math.cos(angle);dy=math.sin(angle)
 tip=(round(7.5+dx*5),round(7.5+dy*5));tail=(round(7.5-dx*3),round(7.5-dy*3))
 d.line((7.5,7.5,*tail),fill=(225,225,220,255),width=1)
 d.line((7.5,7.5,*tip),fill=(91,255,233,255) if recovery else (245,61,68,255),width=2)
 d.point((7,7),fill=(255,255,255,255))
 return im

def clock(frame):
 im=Image.new('RGBA',(16,16));p=im.load();theta=2*math.pi*frame/64
 # Draw a sky/ground disk rotating with the day cycle, enclosed in a gold rim.
 for y in range(16):
  for x in range(16):
   dx=x-7.5;dy=y-7.5;r=math.hypot(dx,dy)
   if r>7:continue
   if r>5.8:p[x,y]=(83,47,19,255)
   elif r>4.8:p[x,y]=(237,188,61,255)
   else:
    vertical=dx*math.sin(theta)+dy*math.cos(theta)
    p[x,y]=(65,143,214,255) if vertical<0 else (22,28,73,255)
 d=ImageDraw.Draw(im)
 sx=round(7.5+math.sin(theta)*3);sy=round(7.5-math.cos(theta)*3)
 mx=round(7.5-math.sin(theta)*3);my=round(7.5+math.cos(theta)*3)
 d.rectangle((sx-1,sy-1,sx+1,sy+1),fill=(255,232,90,255))
 d.rectangle((mx-1,my-1,mx+1,my+1),fill=(209,228,249,255))
 return im

def png(image):
 b=io.BytesIO();image.save(b,format='PNG',optimize=True);return b.getvalue()
def build(path):
 path=Path(path)
 if path.suffix.lower()!='.mcpack':raise ValueError('output must be .mcpack')
 files={'manifest.json':(json.dumps(MANIFEST,ensure_ascii=False,indent=2)+'\n').encode()}
 for name,kind in [('compass','normal'),('lodestonecompass','lodestone'),('recovery_compass','recovery')]:
  frames=[compass(i,kind) for i in range(32)];strip=Image.new('RGBA',(16,512))
  for i,frame in enumerate(frames):strip.paste(frame,(0,16*i))
  files[f'textures/items/{name}_atlas.png']=png(strip);files[f'textures/items/{name}_item.png']=png(frames[0])
 frames=[clock(i) for i in range(64)];strip=Image.new('RGBA',(16,1024))
 for i,frame in enumerate(frames):strip.paste(frame,(0,16*i))
 files['textures/items/watch_atlas.png']=png(strip);files['textures/items/clock_item.png']=png(frames[0])
 path.parent.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for name,data in sorted(files.items()):
   info=zipfile.ZipInfo(name,date_time=(2020,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,data)
 with zipfile.ZipFile(path) as z:
  if z.testzip() is not None or set(z.namelist())!=set(files):raise ValueError('invalid archive')
 return len(files)
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',required=True);args=parser.parse_args()
 print(f'Experimental custom dial overlay: {build(args.output)} files; animated behavior is unverified')
