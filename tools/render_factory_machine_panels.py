#!/usr/bin/env python3
"""Render distinct machine panels only; never touch recipes, geometry or other art."""
import argparse,math
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'Hakkai_v7.1.0/ResourcePack/textures/blocks'
# Each machine has a colour and a large high-contrast functional pictogram.
COLORS={'crusher':('#4f5a62','#cfb18b'),'washer':('#226d88','#6ad8fa'),'press':('#784c49','#f0a774'),'saw':('#685239','#e7c679'),'mixer':('#347c71','#81e5cf'),'assembler':('#745185','#daa6ff'),'filter_router':('#507d46','#bfe38a')}
def render(kind,frame):
 im=Image.new('RGBA',(128,128),'#27282c');d=ImageDraw.Draw(im);c,accent=COLORS[kind]
 d.rounded_rectangle((4,4,123,123),radius=8,fill='#302d30',outline='#d5b578',width=4)
 d.rounded_rectangle((11,11,116,116),radius=5,fill=c,outline='#181c20',width=4)
 for x in (16,111):
  for y in (16,111):d.ellipse((x-3,y-3,x+3,y+3),fill='#ffdda0',outline='#342921',width=1)
 d.rounded_rectangle((24,23,104,98),radius=7,fill='#20272a',outline=accent,width=3)
 # Extra machinery and a colour-independent silhouette distinguish each type.
 if kind=='crusher':
  for x in (44,82):
   d.ellipse((x-15,40,x+15,70),fill='#929b9a',outline='#f8ddb1',width=3)
   for n in range(8):
    a=n*math.pi/4;dx,dy=math.cos(a),math.sin(a);d.line((x+dx*8,55+dy*8,x+dx*15,55+dy*15),fill='#22282b',width=3)
  d.polygon([(54,29),(64,25),(74,29),(68,36),(61,34)],fill='#d8d1ba');d.polygon([(59,76),(64,70),(70,76),(68,83),(61,84)],fill=accent)
 elif kind=='washer':
  d.arc((35,30,93,85),185,500,fill='#d4faff',width=5);d.polygon([(64,31),(51,51),(53,65),(64,71),(75,65),(77,51)],fill='#56cfff',outline='#e4faff');d.line((57,54,59,61),fill='#f2ffff',width=3)
 elif kind=='press':
  d.rectangle((39,30,89,38),fill='#ffcf9b');d.rectangle((55,38,73,57+frame),fill='#cbd3cf',outline='#f8ece0',width=2);d.rectangle((36,78,92,85),fill=accent);d.rectangle((46,65,82,77),fill='#dc8a53',outline='#ffe1a6',width=2)
 elif kind=='saw':
  for n in range(12):
   a=n*math.pi/6;d.line((64+17*math.cos(a),56+17*math.sin(a),64+26*math.cos(a),56+26*math.sin(a)),fill='#e8ede4',width=5)
  d.ellipse((44,36,84,76),fill='#adb6b3',outline='#f8f8e1',width=3);d.ellipse((58,50,70,62),fill='#343a3a');d.rectangle((34,78,94,86),fill='#a97d49',outline='#ffcc85',width=2)
 elif kind=='mixer':
  d.polygon([(40,62),(88,62),(81,84),(47,84)],fill='#5dc9b6',outline='#cefff0');d.rectangle((60,29,68,65),fill='#dedbcc');d.line((45,66,83,78),fill='#f7e3a4',width=5);d.line((83,66,45,78),fill='#f7e3a4',width=5)
 elif kind=='assembler':
  d.rectangle((39,35,89,44),fill='#dfadff');d.rectangle((58,44,70,62),fill='#cbd3de');d.polygon([(43,70),(57,62),(69,69),(83,61),(89,71),(77,82),(57,85),(42,79)],fill='#cb91ed',outline='#f6d9ff');d.rectangle((60,71,68,79),fill='#efe3c0')
 else:
  d.line((39,34,88,34),fill='#edf4c6',width=7);d.line((64,34,64,59),fill='#edf4c6',width=7);d.line((64,59,43,78),fill='#8ff8cf',width=7);d.line((64,59,85,78),fill='#f3d087',width=7);d.ellipse((58,53,70,65),fill='#17271d')
 # Four clearly visible progress frames, keeping the silhouette unchanged.
 d.rectangle((29,104,99,110),fill='#121416')
 for i in range(4):d.rectangle((31+i*17,105,43+i*17,109),fill=accent if i<=frame else '#414748')
 return im
if __name__=='__main__':
 p=argparse.ArgumentParser();g=p.add_mutually_exclusive_group(required=True);g.add_argument('--write',action='store_true');g.add_argument('--check',action='store_true');a=p.parse_args()
 for kind in COLORS:
  for frame in range(4):
   path=OUT/f'hakkai_{kind}_{frame}.png';im=render(kind,frame)
   if a.write:im.save(path,optimize=True)
   elif not path.exists() or Image.open(path).convert('RGBA').tobytes()!=im.tobytes():raise SystemExit(f'factory panel out of date: {path}')
 print('28 machine panels '+('written' if a.write else 'verified')+' (static only)')
