#!/usr/bin/env python3
"""First three individually designed terminus enemies, no gameplay edits.

Procedural surface maps and old-motion remaps are provisional studies.
"""
import argparse
from PIL import ImageDraw
from build_forest_wild_art import c,bone,bake,PALETTE,surface,tint
PALETTE.update({
 'cf_steel':(112,122,126),'cf_dark':(59,69,77),'cf_plate':(153,162,155),'cf_brass':(181,144,94),'cf_light':(219,198,146),
 'cf_dog':(99,113,119),'cf_dog_plate':(143,158,155),'cf_joint':(64,76,81),'cf_lens':(215,190,130),
 'cf_coat':(69,83,92),'cf_coat_edge':(122,128,125),'cf_mask':(152,161,155),'cf_clock':(191,166,124),
 'cf_iron':(105,111,113),'cf_ogre_dark':(58,66,70),'cf_ogre_armor':(150,150,139),'cf_copper':(178,120,82),'cf_glow':(220,179,110),
})

def steel_hound():
 # Four-legged clockwork canine replacing the old humanoid silhouette.
 b=[bone('body',[0,7,0],[c([-2.5,4.8,-3.5],[5,4.7,8.7],'cf_dog'),c([-2.8,7.5,-3.2],[5.6,1.6,6.8],'cf_dog_plate'),c([-2.6,4.4,2.2],[5.2,.7,2.6],'cf_dark')]),
    bone('head',[0,8,-3.2],[c([-2,6.8,-6.8],[4,3.4,4],'cf_dog_plate'),c([-1,6.8,-8.8],[2,1.5,2.3],'cf_dark'),c([-1.7,9.8,-5.7],[1,1.6,1],'cf_steel'),c([.7,9.8,-5.7],[1,1.6,1],'cf_steel')],'body'),
    bone('clock_back',[0,9,1],[c([-1.9,9,-.7],[3.8,.7,3.6],'cf_brass'),c([-1.1,9.6,0],[2.2,.6,2.2],'cf_clock')],'body'),
    bone('tail',[0,7,4.8],[c([-.7,6.3,4.6],[1.4,1.4,3],'cf_joint')],'body'),
    bone('tail_tip',[0,7,7.2],[c([-.8,6.2,7.1],[1.6,1.6,2.5],'cf_plate'),c([-.4,6.5,9.3],[.8,1,1.2],'cf_brass')],'tail')]
 for i,(x,z) in enumerate([(-1.8,-2.1),(1.8,-2.1),(-1.8,4),(1.8,4)]):
  b.append(bone(f'leg_{i}',[x,5,z],[c([x-.7,2.4,z-.65],[1.4,2.8,1.3],'cf_dog')],'body'))
  b.append(bone(f'piston_{i}',[x,2.5,z],[c([x-.5,.5,z-.5],[1,2.1,1],'cf_joint'),c([x-.8,0,z-1],[1.6,.7,1.9],'cf_plate')],f'leg_{i}'))
 return b

def silent_soldier():
 # Upright conductor-like soldier, mask visor, long coat hem and station clock.
 b=[bone('body',[0,9,0],[c([-3.1,4.2,-2],[6.2,6.8,4],'cf_coat'),c([-3.4,8.7,-2.3],[6.8,1.7,4.6],'cf_coat_edge'),c([-2.7,3,-1.8],[5.4,1.5,3.6],'cf_coat')]),
    bone('head',[0,11,0],[c([-2.3,10.5,-2],[4.6,3.7,3.8],'cf_mask'),c([-2.5,13.8,-1.9],[5,.8,3.7],'cf_dark'),c([-2,14.5,-1.5],[4,.6,3],'cf_coat_edge')],'body'),
    bone('station_clock',[0,10,1.5],[c([-1,9.5,1.4],[2,2,1.1],'cf_dark'),c([-1.9,11,1.5],[3.8,3.8,.9],'cf_brass'),c([-1.5,11.4,2.2],[3,3,.4],'cf_clock')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-5.2 if sign<0 else 3
  b.append(bone('arm_'+side,[sign*3,9.8,0],[c([x,5.2,-1.4],[2.2,4.8,2.8],'cf_coat'),c([x-.1,5,-1.5],[2.4,1,3],'cf_brass')],'body'))
  b.append(bone('hand_'+side,[sign*4,5.2,0],[c([x+.2,3.9,-1.2],[1.8,1.5,2.4],'cf_dark')],'arm_'+side))
 for i,x in enumerate((-1.6,1.6)):
  b.append(bone(f'leg_{i}',[x,4,0],[c([x-1,.6,-1.1],[2,3.5,2.2],'cf_dark'),c([x-1.1,0,-1.5],[2.2,.8,2.8],'cf_plate')],'body'))
 return b

def gear_breaker():
 # Broad mechanical ogre with asymmetrical crushing fist and visible rear cogs.
 b=[bone('body',[0,10,0],[c([-4.2,5,-2.6],[8.4,8.4,5.2],'cf_iron'),c([-4.5,11,-3],[9,2.2,6],'cf_ogre_armor'),c([-1.3,7,-3.1],[2.6,2.4,.7],'cf_copper')]),
    bone('head',[0,13.6,0],[c([-2.8,13,-2.4],[5.6,4.1,4.6],'cf_ogre_dark'),c([-3,16.8,-2.1],[6,1,4],'cf_ogre_armor')],'body'),
    bone('back_gear',[0,12,2],[c([-2.2,11,2],[4.4,4.4,1.2],'cf_copper'),c([-2.7,12.4,2],[5.4,1.6,1.2],'cf_brass'),c([-1.3,10.5,2],[2.6,5.4,1.2],'cf_brass'),c([-.8,12.4,3],[1.6,1.6,.5],'cf_dark')],'body'),
    bone('crusher_crest',[0,17,0],[c([-1,17.6,-1],[2,1.5,2],'cf_copper'),c([-.6,18.9,-.6],[1.2,1,1.2],'cf_light')],'head')]
 for side,sign in [('l',-1),('r',1)]:
  x=-7.6 if sign<0 else 4.1;width=3.5 if sign<0 else 3.1
  b.append(bone('arm_'+side,[sign*4.1,12.5,0],[c([x,6.8,-1.9],[width,5.9,3.8],'cf_iron'),c([x-.1,10.5,-2.2],[width+.2,1.8,4.4],'cf_ogre_armor')],'body'))
  fw=4.2 if sign<0 else 3.2
  b.append(bone('fist_'+side,[sign*5.7,7,0],[c([x-.2,3.6,-2.2],[fw,3.5,4.4],'cf_ogre_dark'),c([x-.3,3.5,-2.4],[fw+.2,1.1,4.8],'cf_copper')],'arm_'+side))
 for i,x in enumerate((-2.1,2.1)):
  b.append(bone(f'leg_{i}',[x,5.2,0],[c([x-1.3,.7,-1.4],[2.6,4.6,2.8],'cf_iron'),c([x-1.4,0,-1.8],[2.8,1,3.5],'cf_ogre_dark')],'body'))
 return b

DESIGNS=[steel_hound,silent_soldier,gear_breaker]
def paint(mat,w,h,seed,face,part,ci):
 im=surface(mat,w,h,seed,face,'no_generic_eye',ci);d=ImageDraw.Draw(im);base=PALETTE[mat]
 if mat in ('cf_steel','cf_plate','cf_dog_plate','cf_ogre_armor','cf_copper','cf_brass'):
  for x in (.15,.85):
   for y in (.18,.82):
    r=max(1,min(w,h)//35);d.ellipse((w*x-r,h*y-r,w*x+r,h*y+r),fill=(*tint(base,25),255))
  d.line([(w*.1,h*.13),(w*.9,h*.13)],fill=(*tint(base,-25),255),width=max(1,w//80))
 if mat in ('cf_clock','cf_lens'):
  d.ellipse((w*.18,h*.14,w*.82,h*.86),outline=(83,72,62,255),width=max(1,w//25));d.line([(w*.5,h*.22),(w*.5,h*.5),(w*.7,h*.65)],fill=(72,66,63,255),width=max(1,w//24))
 if part=='head' and ci==0 and face in ('west','east'):
  d.polygon([(w*.22,h*.3),(w*.66,h*.34),(w*.58,h*.5),(w*.3,h*.47)],fill=(31,39,43,255));d.polygon([(w*.3,h*.35),(w*.58,h*.38),(w*.54,h*.45),(w*.33,h*.44)],fill=(236,203,136,255))
 if part=='head' and ci==0 and face=='north':
  if mat=='cf_mask':
   d.rectangle((w*.16,h*.27,w*.84,h*.48),fill=(44,56,61,255));d.line((w*.23,h*.36,w*.77,h*.36),fill=(205,186,142,255),width=max(1,w//28))
  else:
   for x in (.3,.7):d.rectangle((w*(x-.08),h*.32,w*(x+.08),h*.46),fill=(231,195,125,255))
 return im

def material(mat):return (130,0,160,255) if mat in ('cf_steel','cf_plate','cf_dog_plate','cf_ogre_armor','cf_copper','cf_brass') else (0,0,190,255)
def build(i):return bake(f'foe_7_{i}',f'f7_{i}_',DESIGNS[i](),paint,material)
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 for i in range(len(DESIGNS)):
  for path,data in build(i).items():
   if a.write:path.write_bytes(data)
   elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Clockwork foe art stale: '+str(path))
 print(f'{len(DESIGNS)} clockwork foe prototypes: {len(DESIGNS)*4} files '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
