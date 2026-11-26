#!/usr/bin/env python3
"""Three independently designed friendly patrol studies, no vanilla edits.

Keeps existing attack/stride bone names and AI; textures are procedural studies.
"""
import argparse
from PIL import ImageDraw
from build_forest_wild_art import c,bone,bake,PALETTE,surface,tint
PALETTE.update({
 'pat_skin':(191,159,123),'pat_hair':(69,57,47),'pat_eye':(34,43,38),'pat_boot':(76,65,52),'pat_gold':(213,178,96),
 'pat_arch_cloth':(78,113,75),'pat_arch_dark':(47,78,55),'pat_arch_leather':(128,92,59),'pat_arch_trim':(167,155,99),'pat_bow':(105,72,45),'pat_string':(225,209,165),
 'pat_mage_robe':(67,83,128),'pat_mage_dark':(48,58,98),'pat_mage_trim':(170,151,105),'pat_mage_hat':(80,95,137),'pat_mage_gem':(129,198,208),
 'pat_watch_coat':(106,116,105),'pat_watch_armor':(147,153,137),'pat_watch_dark':(68,78,76),'pat_watch_blue':(75,112,121),'pat_watch_rim':(192,173,119),
})

def archer():
 # Slim ranger with hood, layered shoulder cape, back quiver and actual bow.
 b=[bone('body',[0,10,0],[c([-3.2,5,-2],[6.4,7.2,4],'pat_arch_cloth'),c([-3.4,7.8,-2.2],[6.8,1,4.4],'pat_arch_leather'),c([-3.6,10,-2.4],[7.2,1.5,4.8],'pat_arch_dark')]),
    bone('head',[0,12,0],[c([-2.3,11.5,-2.1],[4.6,3.8,4.2],'pat_skin'),c([-2.6,14.8,-2.3],[5.2,1.3,4.6],'pat_arch_dark'),c([-2.5,13.3,1.5],[5,2.3,.8],'pat_arch_dark')],'body'),
    bone('quiver',[0,10,1.8],[c([1,6.8,1.8],[1.8,6,1.6],'pat_arch_leather'),c([1.2,12.4,2],[.45,1.5,.45],'pat_string'),c([2,12.4,2.5],[.45,1.7,.45],'pat_string')],'body'),
    bone('cape',[0,10,1.8],[c([-3,7,1.8],[6,3.5,.7],'pat_arch_dark'),c([-2.7,5.8,1.8],[5.4,1.5,.7],'pat_arch_cloth')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-5.3 if sign<0 else 3.1
  b.append(bone('arm_'+side,[sign*3.1,10.5,0],[c([x,5.5,-1.3],[2.2,5.2,2.6],'pat_arch_cloth'),c([x-.1,5.3,-1.4],[2.4,1,2.8],'pat_arch_leather')],'body'))
  b.append(bone('hand_'+side,[sign*4.1,5.5,0],[c([x+.25,4.5,-1.1],[1.7,1.2,2.2],'pat_skin')],'arm_'+side))
 # Curved-looking segmented bow and string are attached to the left arm.
 b.append(bone('bow',[-4.2,8,0],[c([-5.2,5,-2.4],[.6,7.4,.7],'pat_bow'),c([-5.2,11.8,-2.3],[.6,1.3,1.8],'pat_bow'),c([-5.2,4.3,-2.3],[.6,1.3,1.8],'pat_bow'),c([-5.1,5,-.7],[.35,7,.35],'pat_string')],'arm_l'))
 for i,x in enumerate((-1.7,1.7)):
  b.append(bone(f'leg_{i}',[x,5.2,0],[c([x-1,.7,-1.1],[2,4.6,2.2],'pat_arch_cloth'),c([x-1.1,0,-1.5],[2.2,1.1,2.8],'pat_boot')],'body'))
 return b

def mage():
 # Broad-brimmed, layered hat and tapered robe; staff gem on articulated hand.
 b=[bone('body',[0,10,0],[c([-3.3,4.5,-2.1],[6.6,7.8,4.2],'pat_mage_robe'),c([-3.8,3,-2.5],[7.6,2.2,5],'pat_mage_dark'),c([-3.5,7.8,-2.4],[7,1,4.8],'pat_mage_trim')]),
    bone('head',[0,12.2,0],[c([-2.3,11.7,-2.1],[4.6,3.8,4.2],'pat_skin'),c([-2.5,14.8,-2.1],[5,1.1,4.3],'pat_hair')],'body'),
    bone('hat',[0,15,0],[c([-4,15.3,-3.6],[8,.8,7.2],'pat_mage_dark'),c([-2.9,16,-2.5],[5.8,1.7,5],'pat_mage_hat'),c([-2.1,17.5,-1.8],[4.2,1.5,3.6],'pat_mage_robe'),c([-1.2,18.8,-1],[2.4,1,2],'pat_mage_dark')],'head'),
    bone('mantle',[0,11,1.9],[c([-3.4,9.4,1.9],[6.8,1.8,.7],'pat_mage_trim'),c([-2.8,5,1.9],[5.6,4.5,.7],'pat_mage_robe')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-5.8 if sign<0 else 3.2
  b.append(bone('arm_'+side,[sign*3.2,10.5,0],[c([x,5.5,-1.4],[2.6,5.2,2.8],'pat_mage_robe'),c([x-.2,5.2,-1.6],[3,1.3,3.2],'pat_mage_trim')],'body'))
  b.append(bone('hand_'+side,[sign*4.4,5.6,0],[c([x+.4,4.4,-1.1],[1.8,1.3,2.2],'pat_skin')],'arm_'+side))
 b.append(bone('staff',[4.5,6,0],[c([4.2,2,-1.9],[.65,10,.7],'pat_bow'),c([3.6,11.6,-2.3],[1.8,1.8,1.6],'pat_mage_gem'),c([4,13.2,-2],[1,1,1],'pat_mage_trim')],'arm_r'))
 for i,x in enumerate((-1.6,1.6)):
  b.append(bone(f'leg_{i}',[x,4.5,0],[c([x-1,.7,-1.1],[2,4,2.2],'pat_mage_dark'),c([x-1.1,0,-1.5],[2.2,1,2.8],'pat_boot')],'body'))
 return b

def watch():
 # Wide armor, raised helmet crest and arm-mounted shield, separate from mage.
 b=[bone('body',[0,10,0],[c([-3.8,4.8,-2.3],[7.6,7.5,4.6],'pat_watch_coat'),c([-4.2,9,-2.7],[8.4,2.1,5.4],'pat_watch_armor'),c([-3.2,6,-2.7],[6.4,2,.7],'pat_watch_blue')]),
    bone('head',[0,12,0],[c([-2.4,11.6,-2.2],[4.8,3.8,4.4],'pat_skin'),c([-2.7,14.7,-2.4],[5.4,1.4,4.8],'pat_watch_armor'),c([-2.7,13,-2.5],[.8,2.5,4.9],'pat_watch_dark'),c([1.9,13,-2.5],[.8,2.5,4.9],'pat_watch_dark')],'body'),
    bone('crest',[0,16,0],[c([-.6,15.8,-1.6],[1.2,2.3,3.5],'pat_watch_blue'),c([-.4,17.8,-1.2],[.8,.7,2.7],'pat_watch_rim')],'head'),
    bone('backplate',[0,10,2.1],[c([-3.1,6.4,2.1],[6.2,4.3,.8],'pat_watch_armor')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-6.5 if sign<0 else 3.7
  b.append(bone('arm_'+side,[sign*3.7,10.5,0],[c([x,5.3,-1.5],[2.8,5.4,3],'pat_watch_coat'),c([x-.2,8.9,-1.8],[3.2,1.9,3.6],'pat_watch_armor')],'body'))
  b.append(bone('hand_'+side,[sign*5,5.5,0],[c([x+.4,4.2,-1.2],[2,1.3,2.4],'pat_watch_dark')],'arm_'+side))
 b.append(bone('shield',[-5.1,8,-1.4],[c([-6.6,5,-2.4],[2.7,6.8,.9],'pat_watch_rim'),c([-6.3,5.4,-2.9],[2.1,6,.7],'pat_watch_blue'),c([-5.9,7,-3.2],[1.3,2.3,.5],'pat_gold')],'arm_l'))
 for i,x in enumerate((-2,2)):
  b.append(bone(f'leg_{i}',[x,5,0],[c([x-1.2,.7,-1.2],[2.4,4.5,2.4],'pat_watch_coat'),c([x-1.3,0,-1.6],[2.6,1.1,3],'pat_boot')],'body'))
 return b

NAMES=['village_archer','village_mage','village_watch'];DESIGNS=[archer,mage,watch]
def paint(mat,w,h,seed,face,part,ci):
 im=surface(mat,w,h,seed,face,'no_generic_eye',ci);d=ImageDraw.Draw(im);base=PALETTE[mat]
 if mat in ('pat_arch_cloth','pat_arch_dark','pat_mage_robe','pat_mage_hat','pat_watch_coat'):
  for k in (1,2,3):
   x=w*k/4;d.line([(x,0),(x-w*.025,h*.5),(x,h)],fill=(*tint(base,-18),255),width=max(1,w//90))
 if mat in ('pat_arch_leather','pat_mage_trim','pat_watch_armor','pat_watch_rim'):
  for x in (.15,.85):
   for y in (.18,.82):
    r=max(1,min(w,h)//38);d.ellipse((w*x-r,h*y-r,w*x+r,h*y+r),fill=(*tint(base,25),255))
 if part=='head' and ci==0 and mat=='pat_skin' and face=='north':
  for x in (.3,.7):
   d.rectangle((w*(x-.1),h*.34,w*(x+.1),h*.47),fill=(229,215,183,255));d.rectangle((w*(x-.04),h*.36,w*(x+.04),h*.47),fill=(31,44,42,255))
  d.line((w*.4,h*.72,w*.6,h*.72),fill=(112,76,64,255),width=max(1,w//50))
 if part=='head' and ci==0 and mat=='pat_skin' and face in ('west','east'):
  d.rectangle((w*.32,h*.34,w*.57,h*.47),fill=(45,53,46,255))
 return im

def material(mat):return (110,0,170,255) if mat in ('pat_watch_armor','pat_watch_rim') else (0,0,190,255)
def build(i):return bake(NAMES[i],'',DESIGNS[i](),paint,material)
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 for i in range(len(DESIGNS)):
  for path,data in build(i).items():
   if a.write:path.write_bytes(data)
   elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Patrol art stale: '+str(path))
 print('Three patrol appearance prototypes: 12 files '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
