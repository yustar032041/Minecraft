#!/usr/bin/env python3
"""Three individually authored clockwork-realm wildlife appearance prototypes.

Drawn surfaces and MER metalness are preliminary; actual PBR is unverified.
Only three models and existing maps are written. No behavior or AI changes.
"""
import argparse
from PIL import ImageDraw
from build_forest_wild_art import c,bone,bake,PALETTE,surface,tint
from refine_mob_anatomy import refine_baked
PALETTE.update({
 'clock_hare_fur':(167,132,107),'clock_hare_belly':(218,197,162),'clock_hare_ear':(173,112,103),'clock_hare_needle':(223,178,91),
 'clock_fox_fur':(152,105,76),'clock_fox_muzzle':(218,187,143),'clock_fox_dark':(89,73,65),'clock_fox_copper':(192,121,72),'clock_fox_tip':(236,191,129),
 'clock_guard_body':(98,78,67),'clock_guard_plate':(158,117,74),'clock_guard_joint':(64,58,55),'clock_guard_gear':(218,169,88),'clock_guard_glass':(105,153,150),
})

def hare():
 b=[bone('body',[0,4,0],[c([-2.6,2.7,-2.7],[5.2,4,6.8],'clock_hare_fur'),c([-2.2,2.4,-2],[4.4,.6,5.3],'clock_hare_belly')]),
    bone('head',[0,6,-2.5],[c([-1.9,4.8,-5.6],[3.8,3.5,3.5],'clock_hare_fur'),c([-.9,4.8,-6.8],[1.8,1.2,1.4],'clock_hare_belly')],'body'),
    bone('ear_l',[-1.2,8,-4],[c([-1.7,7.9,-4.8],[1,4.5,1.2],'clock_hare_fur'),c([-1.5,8.5,-5],[.6,3.2,.3],'clock_hare_ear'),c([-1.45,12,-4.6],[.5,1.2,.6],'clock_hare_needle')],'head'),
    bone('ear_r',[1.2,8,-4],[c([.7,7.9,-4.8],[1,3.8,1.2],'clock_hare_fur'),c([.9,8.4,-5],[.6,2.7,.3],'clock_hare_ear')],'head'),
    bone('tail',[0,5,4],[c([-.9,4,4],[1.8,1.8,1.7],'clock_hare_belly')],'body')]
 for i,(x,z) in enumerate([(-1.6,-1.5),(1.6,-1.5),(-1.8,3),(1.8,3)]):
  w=1.1 if i<2 else 1.7
  b.append(bone('leg_'+str(i),[x,3.1,z],[c([x-w/2,.5,z-.65],[w,2.8,1.3],'clock_hare_fur'),c([x-w/2,0,z-1.1],[w,.7,1.9],'clock_hare_belly')],'body'))
 return b

def fox():
 b=[bone('body',[0,5,0],[c([-2.5,4,-3],[5,4.2,7.7],'clock_fox_fur'),c([-2.1,3.6,-2],[4.2,.7,5.4],'clock_fox_muzzle')]),
    bone('head',[0,6,-2.5],[c([-2.1,5.2,-5.8],[4.2,3.4,3.6],'clock_fox_fur'),c([-1.1,5.1,-7.2],[2.2,1.4,1.7],'clock_fox_muzzle'),c([-2,8.3,-5.1],[1.1,1.8,1.2],'clock_fox_dark'),c([.9,8.3,-5.1],[1.1,1.8,1.2],'clock_fox_dark')],'body'),
    bone('tail',[0,6,4.3],[c([-1.5,4.7,4.2],[3,2.8,3],'clock_fox_fur')],'body'),
    bone('tail_plate',[0,6,6.9],[c([-2,4.3,6.8],[4,3.5,3],'clock_fox_copper'),c([-1.8,4.5,9.5],[3.6,3.1,1.5],'clock_fox_tip')],'tail'),
    bone('collar',[0,7,-2],[c([-2.8,6,-2.6],[5.6,2,1.2],'clock_fox_copper')],'body')]
 for i,(x,z) in enumerate([(-1.7,-1.8),(1.7,-1.8),(-1.7,3.1),(1.7,3.1)]):
  b.append(bone('leg_'+str(i),[x,4.4,z],[c([x-.65,.5,z-.65],[1.3,4,1.3],'clock_fox_fur'),c([x-.75,0,z-1],[1.5,.8,1.8],'clock_fox_dark')],'body'))
 return b

def gear_guard():
 b=[bone('body',[0,10,0],[c([-4.2,6,-2.8],[8.4,8,5.6],'clock_guard_body'),c([-3.7,11,-3.3],[7.4,2.4,.7],'clock_guard_plate')]),
    bone('head',[0,14,0],[c([-2.9,13.7,-3.2],[5.8,4.8,5],'clock_guard_body'),c([-3.2,18,-2.7],[6.4,.8,4],'clock_guard_plate'),c([-.6,18.7,-1.8],[1.2,1.2,1.2],'clock_guard_gear')],'body'),
    # Distinct cog on the chest with attached hub and teeth.
    bone('cog',[0,9,-3.3],[c([-2.3,7,-4],[4.6,4,.8],'clock_guard_gear'),c([-2.8,8,-4],[5.6,2,.8],'clock_guard_gear'),c([-1.3,6.5,-4],[2.6,5,.8],'clock_guard_gear'),c([-.7,8.2,-4.4],[1.4,1.6,.5],'clock_guard_glass')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-6.9 if sign<0 else 4.1
  b.append(bone('arm_'+side,[sign*4.2,13,0],[c([x,7,-2],[2.8,6.4,4],'clock_guard_body'),c([x-.2,11,-2.3],[3.2,2.4,4.6],'clock_guard_plate')],'body'))
  b.append(bone('forearm_'+side,[sign*5.5,7,0],[c([x,4.2,-2.1],[2.8,3,4.2],'clock_guard_joint'),c([x-.2,4,-2.3],[3.2,1.1,4.6],'clock_guard_gear')],'arm_'+side))
 for i,x in enumerate((-2.2,2.2)):
  b.append(bone('leg_'+str(i),[x,7,0],[c([x-1.4,1,-1.6],[2.8,6,3.2],'clock_guard_body'),c([x-1.6,0,-2],[3.2,1.4,4],'clock_guard_joint')],'body'))
 return b
DESIGNS=[hare,fox,gear_guard]

def paint(mat,w,h,seed,face,part,ci):
 face_part='no_generic_eye' if mat=='clock_guard_body' else part
 image=surface(mat,w,h,seed,face,face_part,ci);d=ImageDraw.Draw(image)
 if mat=='clock_hare_fur' and part=='body' and ci==0 and face in ('west','east'):
  cx=w*.52;cy=h*.42;r=min(w,h)*.2;d.ellipse((cx-r,cy-r,cx+r,cy+r),outline=(220,181,112,255),width=max(2,w//65));d.line([(cx,cy-r*.7),(cx,cy),(cx+r*.55,cy+r*.2)],fill=(235,197,130,255),width=max(1,w//70))
 if mat=='clock_fox_copper' and face in ('up','west','east'):
  for k in (1,2,3):
   x=w*k/4;d.line((x,0,x,h-1),fill=(134,78,54,255),width=max(1,w//85));d.ellipse((x-1,h*.2-1,x+1,h*.2+1),fill=(244,194,126,255))
 if mat=='clock_guard_body' and part=='head' and ci==0 and face in ('north','south'):
  for x in (.31,.69):
   d.rectangle((w*(x-.12),h*.35,w*(x+.12),h*.5),fill=(39,37,34,255));d.rectangle((w*(x-.08),h*.39,w*(x+.08),h*.46),fill=(174,222,206,255))
 if mat=='clock_guard_plate' and face in ('up','west','east','north','south'):
  d.rectangle((w*.08,h*.08,w*.92,h*.92),outline=(99,68,48,255),width=max(1,w//80))
  for x,y in ((.14,.16),(.86,.16),(.14,.84),(.86,.84)):
   r=max(1,min(w,h)//28);d.ellipse((w*x-r,h*y-r,w*x+r,h*y+r),fill=(220,180,113,255))
 return image

def mer(mat):return (95 if mat in ('clock_fox_copper','clock_guard_plate','clock_guard_gear') else 0,0,180 if 'clock_guard' in mat else 190,255)
def build(i):
 name=f'wild_7_{i}'
 return refine_baked(name,bake(name,f'w7_{i}_',DESIGNS[i](),paint,mer))
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 for i in range(3):
  for path,data in build(i).items():
   if a.write:path.write_bytes(data)
   elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Clockwork wildlife art stale: '+str(path))
 print('Three clockwork wildlife prototypes: 12 files '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
