#!/usr/bin/env python3
"""Create an ornate eight-realm king appearance without gameplay edits.

An AI-generated material study supplies cropped metal ornament; the eight
sigils and face are drawn per face. Models/maps are prototypes, not a claim
of Bedrock, PBR, animation or hitbox validation. Legacy assets are retained.
"""
import argparse,io,json,random
from pathlib import Path
from PIL import Image,ImageDraw,ImageEnhance
from build_forest_wild_art import c,bone,bake,PALETTE,surface,tint

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Image.open(ROOT/'tools/art_templates/eight_king/obsidian_gold.png').convert('RGB')
PALETTE.update({
 'king_metal':(44,40,67),'king_armor':(61,55,78),'king_dark':(27,26,42),'king_gold':(192,145,80),'king_pale':(238,201,125),
 'king_face':(50,50,68),'king_core':(215,118,114),'king_violet':(120,83,144),'king_cape':(51,42,68),
 'king_grass':(112,169,99),'king_forest':(72,131,105),'king_desert':(219,175,109),'king_ice':(139,204,225),
 'king_storm':(226,185,86),'king_underworld':(176,114,199),'king_sky':(167,206,212),'king_clockwork':(192,144,92),
})
SIGILS=['grass','forest','desert','ice','storm','underworld','sky','clockwork']

def design():
 # Original body/head/arms/legs are kept by name for existing idle, stride and
 # attack aliases. Additional pieces are children and follow those transforms.
 b=[bone('body',[0,18,0],[c([-7,14,-3.8],[14,14,7.6],'king_metal'),c([-5.8,11,-3.4],[11.6,4,6.8],'king_armor'),c([-7.4,25.6,-4.1],[14.8,2.5,8.2],'king_gold')]),
    bone('breastplate',[0,24,-3.8],[c([-6.5,21,-4.5],[13,5.8,1.1],'king_armor'),c([-6.9,20.7,-4.4],[13.8,.6,1],'king_gold')],'body'),
    bone('core',[0,19,-4],[c([-3.1,15.3,-4.8],[6.2,5.4,1.1],'king_dark'),c([-2.5,15.8,-5.2],[5,4.4,.7],'king_gold'),c([-1.8,16.4,-5.6],[3.6,3.2,.6],'king_core')],'body'),
    bone('head',[0,28,0],[c([-4,27.8,-3.6],[8,7.2,7.2],'king_metal'),c([-4.2,34.5,-3.6],[8.4,1.1,7.2],'king_gold')],'body'),
    bone('faceplate',[0,32,-3.6],[c([-3.4,29,-4.1],[6.8,4.7,.8],'king_face'),c([-3.6,33,-4.3],[7.2,.8,1],'king_gold'),c([-.7,28.6,-4.5],[1.4,1.4,1],'king_pale')],'head'),
    bone('crown',[0,35,0],[c([-4.2,35.2,-2.8],[8.4,.9,5.8],'king_gold'),c([-4,36,-2.6],[1.2,3.5,1.5],'king_gold'),c([2.8,36,-2.6],[1.2,3.5,1.5],'king_gold'),c([-1.1,36,-2.6],[2.2,4.6,1.5],'king_violet'),c([-.6,40.4,-2.4],[1.2,1.3,1.1],'king_pale')],'head'),
    # The frame is physically connected by a rear post; its eight separate
    # chest sigils, not the frame, carry the names and motifs of the realms.
    bone('halo',[0,28,3],[c([-.8,26,3.5],[1.6,5,2.3],'king_gold'),c([-9,30,4.7],[18,1.2,1.2],'king_gold'),c([-9,30.8,4.7],[1.2,9.7,1.2],'king_gold'),c([7.8,30.8,4.7],[1.2,9.7,1.2],'king_gold'),c([-9,39.8,4.7],[18,1.2,1.2],'king_gold'),c([-6.7,40.8,4.7],[13.4,.8,1.2],'king_pale')],'body'),
    bone('cape',[0,26,3],[c([-6.5,17,3.5],[13,9.2,1.2],'king_cape'),c([-5.8,11.6,3.5],[11.6,5.8,1.2],'king_cape'),c([-6.7,24.5,3.4],[13.4,1.7,1.4],'king_gold')],'body'),
    bone('front_skirt',[0,12,-3],[c([-5.7,8,-4],[11.4,4,1.2],'king_armor'),c([-5.8,7.8,-4.1],[11.6,.8,1.4],'king_gold')],'body')]
 for i,name in enumerate(SIGILS):
  col=i%4;row=i//4;x=-5.55+col*2.85;y=21.4+row*2.6
  b.append(bone('realm_'+name,[x+1.1,y+1,-4.6],[c([x,y,-4.9],[2.2,2.1,.6],'king_'+name)],'breastplate'))
 for side,sgn in [('l',-1),('r',1)]:
  ax=-11.2 if sgn<0 else 6.8
  b.append(bone('arm_'+side,[sgn*6.9,25.3,0],[c([ax,14,-3.1],[4.4,11.7,6.2],'king_metal'),c([ax-.35,23,-3.7],[5.1,3.5,7.4],'king_armor')],'body'))
  b.append(bone('pauldron_'+side,[sgn*8.7,25,0],[c([ax-.6,25.7,-3.8],[5.6,2,7.6],'king_gold'),c([ax-.3,27.4,-3.4],[5,1.1,6.8],'king_armor'),c([ax+.9,28.3,-2.3],[2.6,1.5,3.2],'king_violet')],'arm_'+side))
  b.append(bone('forearm_'+side,[sgn*9,14.2,0],[c([ax-.1,8.6,-3.3],[4.6,5.7,6.6],'king_armor'),c([ax-.3,8.4,-3.5],[5,1.4,7],'king_gold')],'arm_'+side))
  b.append(bone('fist_'+side,[sgn*9,9,0],[c([ax+.2,6.2,-3],[4,2.5,6],'king_dark'),c([ax+.3,6,-3.2],[3.8,.8,6.4],'king_gold')],'forearm_'+side))
 for i,x in enumerate((-3.2,3.2)):
  b.append(bone(f'leg_{i}',[x,12.3,0],[c([x-2,6.3,-2.3],[4,6,4.6],'king_metal'),c([x-2.2,9.4,-2.5],[4.4,2.5,5],'king_armor')]))
  b.append(bone(f'shin_{i}',[x,6.5,0],[c([x-1.8,1.2,-2.1],[3.6,5.4,4.2],'king_armor'),c([x-2.2,3.8,-2.5],[4.4,1.5,5],'king_gold'),c([x-2.3,0,-3],[4.6,1.5,5.8],'king_dark')],f'leg_{i}'))
 return b

def realm_mark(d,name,w,h):
 # Each of eight face-specific symbols is simple and readable at game scale.
 ink=(29,34,43,255);hi=(247,232,185,255);lw=max(1,int(min(w,h)*.08));cx=w*.5;cy=h*.5
 if name=='grass':d.arc((w*.12,h*.2,w*.85,h*.8),25,320,fill=hi,width=lw)
 elif name=='forest':d.polygon([(cx,h*.1),(w*.8,h*.4),(cx,h*.9),(w*.2,h*.4)],outline=hi,width=lw);d.line((cx,h*.15,cx,h*.8),fill=ink,width=lw)
 elif name=='desert':
  for y in (.3,.5,.7):d.line((w*.16,h*y,w*.84,h*y),fill=hi,width=lw)
 elif name=='ice':
  d.polygon([(cx,h*.08),(w*.82,cy),(cx,h*.92),(w*.18,cy)],outline=hi,width=lw);d.line((cx,h*.1,cx,h*.9),fill=hi,width=lw)
 elif name=='storm':d.line([(w*.64,h*.12),(w*.34,h*.52),(w*.62,h*.52),(w*.36,h*.88)],fill=hi,width=lw)
 elif name=='underworld':
  for x,y in ((.3,.3),(.66,.38),(.47,.68)):
   r=min(w,h)*.1;d.ellipse((w*x-r,h*y-r,w*x+r,h*y+r),outline=hi,width=lw)
 elif name=='sky':d.line([(w*.23,h*.78),(w*.75,h*.2)],fill=hi,width=lw);d.line([(w*.43,h*.54),(w*.25,h*.43)],fill=hi,width=lw)
 elif name=='clockwork':d.ellipse((w*.18,h*.17,w*.82,h*.83),outline=hi,width=lw);d.line([(cx,h*.25),(cx,cy),(w*.7,h*.62)],fill=hi,width=lw)

def paint(mat,w,h,seed,face,part,ci):
 if mat in ('king_metal','king_armor','king_cape'):
  rng=random.Random(seed);sw,sh=SOURCE.size;cw=min(sw,max(120,min(sw,int(w*3.5))));ch=min(sh,max(120,min(sh,int(h*3.5))))
  x=rng.randrange(sw-cw+1);y=rng.randrange(sh-ch+1)
  im=SOURCE.crop((x,y,x+cw,y+ch)).resize((w,h),Image.Resampling.LANCZOS).convert('RGBA')
  if mat=='king_cape':im=ImageEnhance.Brightness(im).enhance(.68)
 else:im=surface(mat,w,h,seed,face,'no_generic_eye',ci)
 d=ImageDraw.Draw(im)
 if mat in ('king_gold','king_pale'):
  d.line((w*.08,h*.14,w*.92,h*.14),fill=(*tint(PALETTE[mat],24),255),width=max(1,w//55));d.line((w*.08,h*.84,w*.92,h*.84),fill=(*tint(PALETTE[mat],-30),255),width=max(1,w//70))
 if mat=='king_face' and face=='north':
  for x in (.29,.71):
   d.polygon([(w*(x-.13),h*.29),(w*(x+.13),h*.33),(w*(x+.1),h*.48),(w*(x-.1),h*.46)],fill=(21,22,34,255))
   d.polygon([(w*(x-.09),h*.34),(w*(x+.09),h*.36),(w*(x+.07),h*.43),(w*(x-.07),h*.42)],fill=(255,206,129,255))
  d.line([(w*.3,h*.72),(w*.5,h*.8),(w*.7,h*.72)],fill=(188,158,120,255),width=max(1,w//45))
 if mat=='king_core' and face=='north':
  d.ellipse((w*.1,h*.08,w*.9,h*.92),fill=(106,39,58,255));d.ellipse((w*.23,h*.2,w*.77,h*.8),fill=(243,166,131,255));d.polygon([(w*.5,h*.2),(w*.7,h*.5),(w*.5,h*.8),(w*.3,h*.5)],fill=(255,224,175,255))
 if mat.startswith('king_') and mat.removeprefix('king_') in SIGILS and face=='north':realm_mark(d,mat.removeprefix('king_'),w,h)
 return im

def material(mat):
 if mat in ('king_metal','king_armor','king_gold','king_pale'):return (140,0,150,255)
 if mat=='king_core':return (20,80,160,255)
 return (0,0,190,255)

def build():
 out=bake('eclipse_colossus','',design(),paint,material)
 geo=ROOT/'Hakkai_v7.1.0/ResourcePack/models/entity/eclipse_colossus.geo.json'
 obj=json.loads(out[geo]);obj['minecraft:geometry'][0]['description'].update(visible_bounds_width=5,visible_bounds_height=5,visible_bounds_offset=[0,1.4,0])
 out[geo]=(json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode();return out

def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 for path,data in build().items():
  if a.write:path.write_bytes(data)
  elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Eight-realm king art stale: '+str(path))
 print('Eight-realm king appearance: model and 3 maps '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
