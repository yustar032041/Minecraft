#!/usr/bin/env python3
"""Three explicitly authored grassland appearance prototypes, never bulk-generate.

Historical 512px build, retained for reproduction of the previous prototype.
--check compares with the saved legacy snapshots, never the newer pack files.
--write refuses to overwrite the new individual rigs unless an explicit
--allow-legacy-overwrite is also supplied. Does not change gameplay.
"""
import argparse, hashlib, io, json, math, random
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
RP=ROOT/'Hakkai_v7.1.0/ResourcePack'
TEMPLATES=ROOT/'tools/art_templates/mob_baselines'
SIZE=512

# Materials are specific to these two named animals, not a generic recolour.
PALETTE={
 'deer':{'coat':(153,104,66),'head':(163,112,72),'muzzle':(203,165,118),'antler':(98,76,57),'tail':(198,164,122),'leg':(143,98,65),'flower':(246,184,191),'leaf':(84,127,69)},
 'fox':{'coat':(186,107,57),'head':(196,115,64),'muzzle':(233,203,164),'ear':(145,73,46),'tail':(188,101,52),'tailtip':(234,213,181),'leg':(99,65,48),'tuft':(236,207,169)},
 'bramble':{'bark':(82,75,46),'head':(73,83,51),'thorn':(151,143,89),'ridge':(214,169,61),'moss':(94,130,64),'limb':(76,80,49)}
}

def color(base, delta):return tuple(max(0,min(255,int(c+delta))) for c in base)
def png_bytes(img):
 b=io.BytesIO();img.save(b,format='PNG',optimize=True);return b.getvalue()

def build(kind,entity):
 obj=json.loads((TEMPLATES/f'{entity}.geo.json').read_text(encoding='utf8'))
 model=obj['minecraft:geometry'][0];bones={b['name']:b for b in model['bones']}
 if kind=='deer':
  # Blossoms and leaf buds are attached to the animated head/antlers.
  bones['head']['cubes'] += [
   {'origin':[-3.5,17.2,-4.5],'size':[2,1,2]}, {'origin':[1.5,17.2,-4.5],'size':[2,1,2]},
   {'origin':[-4.3,16.6,-4.2],'size':[1,1,1]}, {'origin':[3.3,16.6,-4.2],'size':[1,1,1]},
   {'origin':[-2.9,17.9,-4.1],'size':[1,1,1]}, {'origin':[1.9,17.9,-4.1],'size':[1,1,1]},
  ]
 elif kind=='fox':
  # A fox-like bushy tail, cream tip and a small chest ruff; attached to
  # original bones, retaining every pre-existing animated bone and pivot.
  bones['tail']['cubes'][0]['origin']=[-2,4,4];bones['tail']['cubes'][0]['size']=[4,4,6]
  bones['tail']['cubes'] += [{'origin':[-1.75,4.25,10],'size':[3.5,3.5,2]}]
  bones['body']['cubes'] += [{'origin':[-2,3.5,-3.6],'size':[4,2,1]}]
  bones['head']['cubes'] += [{'origin':[-2,10,-5.2],'size':[.6,1.5,.6]}, {'origin':[1.4,10,-5.2],'size':[.6,1.5,.6]}]
 else:
  # Thorn crown and staggered shoulder and forearm spikes. Cubes remain on
  # existing animated bones; none are hitboxes or additional combat effects.
  bones['head']['cubes'] += [
   {'origin':[-3,19,-2.5],'size':[1.2,2,1.2]},
   {'origin':[-.6,19,-3],'size':[1.2,3,1.2]},
   {'origin':[1.8,19,-2.5],'size':[1.2,2,1.2]},
  ]
  for side in ('arm_l','arm_r'):
   base=-8.8 if side=='arm_l' else 7.3
   bones[side]['cubes'] += [
    {'origin':[base,12,-2.3],'size':[1.5,2,1.5]},
    {'origin':[base,9,0],'size':[1.5,1.7,1.5]},
    {'origin':[base,6,-1.5],'size':[1.5,1.5,1.5]},
   ]
  bones['body']['cubes'] += [{'origin':[-3,14,-2],'size':[6,1,4]}]
 atlas=Image.new('RGBA',(SIZE,SIZE),(0,0,0,0)); relief=Image.new('L',(SIZE,SIZE),128); mer=Image.new('RGBA',(SIZE,SIZE),(0,0,180,0));
 x=y=2;row=0
 for bone in model['bones']:
  name=bone['name']
  for ci,cube in enumerate(bone.get('cubes',[])):
   if kind=='bramble':
    if name=='body':mat='bark' if ci==0 else 'moss'
    elif name=='head':mat='head' if ci==0 else 'ridge' if ci==1 else 'thorn'
    elif name.startswith('arm_'):mat='limb' if ci==0 else 'thorn'
    else:mat='limb'
   elif name=='body':mat='coat' if ci==0 else 'tuft'
   elif name=='head':
    if ci==0:mat='head'
    elif ci==1:mat='muzzle'
    elif kind=='deer':mat=('antler' if ci<6 else 'flower' if ci in (6,7,10,11) else 'leaf')
    else:mat='ear' if ci in (2,3) else 'tuft'
   elif name=='tail':mat='tailtip' if kind=='fox' and ci==1 else 'tail'
   else:mat='leg'
   sx,sy,sz=cube['size']
   # Face atlas is laid out independently, allowing each face its own shading.
   faces={'west':(sz,sy),'east':(sz,sy),'north':(sx,sy),'south':(sx,sy),'up':(sx,sz),'down':(sx,sz)}
   uv={}
   for face,(fw,fh) in faces.items():
    w=max(4,round(fw*8));h=max(4,round(fh*8));space=2
    if x+w+space>SIZE:x=2;y+=row;row=0
    if y+h+space>SIZE:raise ValueError(f'{entity} atlas overflow')
    uv[face]={'uv':[x,y],'uv_size':[w,h]}
    rng=random.Random(f'{entity}/{name}/{ci}/{face}');base=PALETTE[kind][mat]
    image=Image.new('RGBA',(w,h));height=Image.new('L',(w,h));pix=image.load();hp=height.load()
    faceLight={'up':16,'down':-19,'west':-4,'east':1,'north':3,'south':-2}[face]
    for yy in range(h):
     for xx in range(w):
      noise=rng.uniform(-4,4);fade=5-11*yy/max(1,h-1);grain=2*math.sin(xx*.61+yy*.17)
      val=faceLight+fade+noise+grain
      pix[xx,yy]=(*color(base,val),255);hp[xx,yy]=int(max(0,min(255,128+noise*2+grain*2)))
    draw=ImageDraw.Draw(image);hd=ImageDraw.Draw(height)
    if mat in ('coat','head','tail','leg','tuft','tailtip','muzzle'):
     for _ in range(max(4,(w*h)//100)):
      px=rng.randrange(w);py=rng.randrange(h);length=rng.randrange(2,6)
      draw.line((px,py,min(w-1,px+1),min(h-1,py+length)),fill=(*color(base,rng.choice([-18,-11,13,20])),255),width=1)
      hd.line((px,py,min(w-1,px+1),min(h-1,py+length)),fill=rng.randint(138,154),width=1)
    # Conspicuous natural white flank spots; hand-placed within each side.
    if kind=='deer' and mat=='coat' and face in ('east','west'):
     for cx,cy,r in [(0.18,.34,2),(.38,.26,2),(.58,.38,2),(.78,.3,2),(.28,.55,1),(.68,.6,1)]:
      px=int(cx*w);py=int(cy*h);draw.ellipse((px-r,py-r,px+r,py+r),fill=(230,208,170,255));hd.ellipse((px-r,py-r,px+r,py+r),fill=145)
    # Eyes are on the side faces of the head, not repeated on every cube.
    if kind!='bramble' and name=='head' and ci==0 and face in ('west','east'):
     px=int(w*.42);py=int(h*.43);rx=max(2,w//11);ry=max(2,h//9)
     draw.ellipse((px-rx-1,py-ry-1,px+rx+1,py+ry+1),fill=(232,204,161,255))
     draw.ellipse((px-rx,py-ry,px+rx,py+ry),fill=(41,30,25,255));draw.point((px-1,py-1),fill=(255,245,219,255))
    if mat=='flower':
     for px,py in [(w*.5,h*.5),(w*.22,h*.32),(w*.78,h*.32),(w*.25,h*.73),(w*.75,h*.73)]:
      r=max(1,min(w,h)//8);draw.ellipse((px-r,py-r,px+r,py+r),fill=(255,220,221,255))
     r=max(1,min(w,h)//8);draw.ellipse((w*.5-r,h*.5-r,w*.5+r,h*.5+r),fill=(239,191,75,255))
    if kind=='bramble' and mat in ('bark','head','limb'):
     # Bark plates and interlaced living vines rather than fur.
     for n in range(2, max(3,w//10)):
      xx=(n*11+ci*3)%w
      draw.line([(xx,0),(max(0,xx-3),h//3),(min(w-1,xx+2),2*h//3),(max(0,xx-1),h-1)],fill=(*color(base,-25),255),width=1)
     for n in range(1,max(2,h//16)):
      yy=(n*17+ci*3)%h
      draw.line([(0,yy),(w//3,max(0,yy-5)),(2*w//3,min(h-1,yy+3)),(w-1,max(0,yy-3))],fill=(115,151,68,255),width=2)
    if kind=='bramble' and name=='body' and ci==0 and face=='north':
     # A prominent amber, thorn-framed chest core marks its defensive role.
     cx=w//2;cy=h//2;rx=max(4,w//6);ry=max(5,h//5)
     draw.polygon([(cx,cy-ry),(cx+rx,cy),(cx,cy+ry),(cx-rx,cy)],fill=(49,56,39,255))
     draw.polygon([(cx,cy-ry+3),(cx+rx-3,cy),(cx,cy+ry-3),(cx-rx+3,cy)],fill=(200,148,57,255))
     draw.line([(cx,cy-ry+4),(cx,cy+ry-4)],fill=(250,211,105,255),width=2)
    if mat in ('ear','antler','thorn'):
     draw.line((w//2,0,w//2,h-1),fill=(*color(base,25),255),width=max(1,w//10))
    atlas.paste(image,(x,y));relief.paste(height,(x,y))
    # Nonmetal, matte, no emission; same alpha coverage as albedo.
    mer.paste(Image.new('RGBA',(w,h),(0,0,190,255)),(x,y))
    x+=w+space;row=max(row,h+space)
   cube['uv']=uv
 # Face-relative height gives a restrained tangent-space normal. Alpha matches
 # the painted regions; actual PBR support depends on Bedrock/render mode.
 normal=Image.new('RGBA',(SIZE,SIZE),(128,128,255,0));np=normal.load();ap=atlas.load();hh=relief.load()
 for py in range(1,SIZE-1):
  for px in range(1,SIZE-1):
   if ap[px,py][3]:
    dx=max(-24,min(24,(hh[px-1,py]-hh[px+1,py])*.4));dy=max(-24,min(24,(hh[px,py-1]-hh[px,py+1])*.4))
    np[px,py]=(round(128+dx),round(128+dy),252,255)
 encoded=(json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode('utf8')
 return {RP/f'models/entity/{entity}.geo.json':encoded,RP/f'textures/entity/{entity}.png':png_bytes(atlas),RP/f'textures/entity/{entity}_mer.png':png_bytes(mer),RP/f'textures/entity/{entity}_n.png':png_bytes(normal)}

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');parser.add_argument('--write',action='store_true');parser.add_argument('--allow-legacy-overwrite',action='store_true');args=parser.parse_args()
 if args.check==args.write:parser.error('choose exactly one of --check or --write')
 if args.write and not args.allow_legacy_overwrite:parser.error('legacy build would overwrite individual rigs; pass --allow-legacy-overwrite only for intentional rollback')
 outputs={}
 for kind,entity in [('deer','wild_0_0'),('fox','wild_0_1'),('bramble','wild_0_2')]:outputs.update(build(kind,entity))
 bad=[];legacy=ROOT/'tools/art_templates/grassland_legacy'
 for path,data in outputs.items():
  if args.check:
   target=legacy/('models' if path.suffix=='.json' else 'textures')/path.name
   if not target.exists() or target.read_bytes()!=data:bad.append(str(target.relative_to(ROOT)))
  else:path.write_bytes(data)
 if bad:raise SystemExit('Legacy grassland snapshots out of sync: '+', '.join(bad))
 print(f'Three legacy grassland prototypes: {len(outputs)} files '+('verified' if args.check else 'written'))
if __name__=='__main__':main()
