#!/usr/bin/env python3
"""Individual grassland deer, fox and bramble creature appearance prototypes.

Each model has a separately authored rig and surface motifs. Procedural colors
are not finished paintings; no AI, hitboxes, drops or vanilla models change.
The previous 512px prototypes are preserved in art_templates/grassland_legacy.
"""
import argparse,random
from PIL import ImageDraw
from build_forest_wild_art import c,bone,bake,PALETTE,surface,tint
PALETTE.update({
 'meadow_deer_coat':(147,101,68),'meadow_deer_belly':(209,177,130),'meadow_deer_hoof':(83,64,50),'meadow_antler':(100,77,58),'meadow_leaf':(86,139,78),'meadow_flower':(238,178,190),
 'meadow_fox_fur':(184,103,55),'meadow_fox_muzzle':(232,207,165),'meadow_fox_dark':(98,65,48),'meadow_fox_tail':(194,112,62),'meadow_fox_tip':(238,221,185),'meadow_wind_charm':(211,172,95),
 'bramble_bark':(82,78,49),'bramble_moss':(99,132,67),'bramble_thorn':(159,148,93),'bramble_core':(217,162,62),'bramble_dark':(52,63,43),
})

def deer():
 b=[bone('body',[0,9,0],[c([-2.9,8,-3.5],[5.8,4.8,9.1],'meadow_deer_coat'),c([-2.4,7.5,-2.8],[4.8,.8,7.2],'meadow_deer_belly')]),
    bone('neck',[0,10,-3],[c([-1.7,9.5,-4.6],[3.4,4.4,2.4],'meadow_deer_coat')],'body'),
    bone('head',[0,13,-4],[c([-1.9,12,-6.8],[3.8,3.4,3.5],'meadow_deer_coat'),c([-1.1,12,-8.2],[2.2,1.3,1.6],'meadow_deer_belly'),c([-2.5,14,-4.8],[1,1.1,1.7],'meadow_deer_coat'),c([1.5,14,-4.8],[1,1.1,1.7],'meadow_deer_coat')],'neck'),
    bone('tail',[0,10,5.4],[c([-.8,9.5,5.3],[1.6,1.5,2],'meadow_deer_belly')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=sign*1.3;out=-3.4 if sign<0 else 1.1
  b.append(bone('antler_'+side,[x,15,-5],[c([x-.45,15,-5.3],[.9,3.8,.9],'meadow_antler'),c([out,17.8,-5.2],[2.3,.7,.8],'meadow_antler'),c([-3.4 if sign<0 else 2.7,17.8,-5.2],[.7,1.4,.8],'meadow_antler')],'head'))
  tip=-3.05 if sign<0 else 3.05
  # Blossoms and leaves inherit the antler rather than floating independently.
  b.append(bone('blossom_'+side,[tip,18.5,-5],[c([tip-.8,18.4,-5.8],[1.6,.8,1.6],'meadow_flower'),c([tip-.45,19,-5.4],[.9,.6,.9],'meadow_flower'),c([tip-.9,18.3,-4.6],[.8,.45,1],'meadow_leaf')],'antler_'+side))
 for i,(x,z) in enumerate([(-2,-2),(2,-2),(-2,4.2),(2,4.2)]):
  b.append(bone('leg_'+str(i),[x,8.2,z],[c([x-.55,4,z-.6],[1.1,4.3,1.2],'meadow_deer_coat')],'body'))
  b.append(bone('shin_'+str(i),[x,4.1,z],[c([x-.46,.8,z-.5],[.92,3.3,1],'meadow_deer_coat'),c([x-.65,0,z-.8],[1.3,1,1.6],'meadow_deer_hoof')],'leg_'+str(i)))
 return b

def fox():
 b=[bone('body',[0,5,0],[c([-2.4,3.8,-3],[4.8,4,7.5],'meadow_fox_fur'),c([-2,3.4,-2.1],[4,.7,5.5],'meadow_fox_muzzle')]),
    bone('head',[0,6,-2.5],[c([-2,5,-5.8],[4,3.4,3.8],'meadow_fox_fur'),c([-1.1,5,-7.2],[2.2,1.4,1.7],'meadow_fox_muzzle')],'body'),
    bone('ear_l',[-1.4,8,-4.4],[c([-2,8,-5.2],[1.2,2,1.2],'meadow_fox_dark'),c([-1.8,8.3,-5.4],[.8,1.2,.3],'meadow_fox_fur')],'head'),
    bone('ear_r',[1.4,8,-4.4],[c([.8,8,-5.2],[1.2,2,1.2],'meadow_fox_dark'),c([1,8.3,-5.4],[.8,1.2,.3],'meadow_fox_fur')],'head'),
    bone('ruff',[0,6,-2.7],[c([-2.6,4.6,-3.1],[5.2,2.8,1.4],'meadow_fox_muzzle')],'body'),
    bone('wind_charm',[0,4.5,-3.2],[c([-.5,4,-3.4],[1,.7,.5],'meadow_wind_charm')],'ruff'),
    bone('tail',[0,6,4],[c([-1.5,4.6,4],[3,2.8,3.2],'meadow_fox_tail')],'body'),
    bone('tail_plume',[0,6,6.9],[c([-2.1,4.1,6.8],[4.2,3.8,3.4],'meadow_fox_tail'),c([-1.9,4.3,9.9],[3.8,3.4,1.7],'meadow_fox_tip')],'tail')]
 for i,(x,z) in enumerate([(-1.6,-1.8),(1.6,-1.8),(-1.6,3.1),(1.6,3.1)]):
  b.append(bone('leg_'+str(i),[x,4.1,z],[c([x-.6,.6,z-.6],[1.2,3.6,1.2],'meadow_fox_fur'),c([x-.7,0,z-.9],[1.4,1,1.6],'meadow_fox_dark')],'body'))
 return b

def bramble():
 b=[bone('body',[0,10,0],[c([-4.2,6,-2.8],[8.4,8.5,5.6],'bramble_bark'),c([-3.8,13.8,-2],[7.6,1.1,4],'bramble_moss')]),
    bone('head',[0,14,0],[c([-2.9,13.8,-3.1],[5.8,4.5,5.2],'bramble_bark'),c([-2,17.2,-3.5],[4,.6,.8],'bramble_dark')],'body'),
    bone('core',[0,10,-2.7],[c([-1.8,8.2,-3.5],[3.6,3.6,.8],'bramble_dark'),c([-1.1,8.8,-3.9],[2.2,2.4,.6],'bramble_core')],'body'),
    bone('crown',[0,18,-1.5],[c([-2.4,18,-2.2],[1,2.2,1.1],'bramble_thorn'),c([-.5,18,-2.2],[1,3,1.1],'bramble_thorn'),c([1.4,18,-2.2],[1,1.8,1.1],'bramble_thorn'),c([-2.4,17.8,-2.2],[4.8,.6,1.1],'bramble_moss')],'head')]
 for side,sign in [('l',-1),('r',1)]:
  x=-7.2 if sign<0 else 4;outer=-8 if sign<0 else 6.6
  b.append(bone('arm_'+side,[sign*4.1,13,0],[c([x,8,-2],[3.2,5.5,4],'bramble_bark'),c([x-.2,11,-2.4],[3.6,2.2,4.8],'bramble_moss')],'body'))
  b.append(bone('forearm_'+side,[sign*5.5,8,0],[c([x,4.2,-2.2],[3.2,4,4.4],'bramble_bark'),c([outer,5.2,-.7],[1.4,2,1.4],'bramble_thorn')],'arm_'+side))
  b.append(bone('shoulder_thorn_'+side,[sign*5.4,13,-.6],[c([outer,12,-1.5],[1.3,2.7,1.4],'bramble_thorn')],'arm_'+side))
 for i,x in enumerate((-2.1,2.1)):
  b.append(bone('leg_'+str(i),[x,7,0],[c([x-1.3,1,-1.6],[2.6,6,3.2],'bramble_bark'),c([x-1.5,0,-2],[3,1.4,4],'bramble_dark')],'body'))
 return b
DESIGNS=[deer,fox,bramble]

def paint(mat,w,h,seed,face,part,ci):
 base_part='no_generic_eye' if mat=='bramble_bark' else part
 image=surface(mat,w,h,seed,face,base_part,ci);d=ImageDraw.Draw(image);rng=random.Random(seed+'/motif');base=PALETTE[mat]
 if mat=='meadow_deer_coat' and part=='body' and ci==0 and face in ('west','east'):
  for x,y in ((.18,.3),(.37,.24),(.58,.33),(.76,.27),(.28,.53),(.66,.52)):
   r=max(2,min(w,h)//30);d.ellipse((w*x-r,h*y-r,w*x+r,h*y+r),fill=(231,210,169,255))
 if mat=='meadow_flower':
  r=max(1,min(w,h)//10)
  for x,y in ((.5,.25),(.25,.45),(.75,.45),(.35,.7),(.65,.7)):
   d.ellipse((w*x-r,h*y-r,w*x+r,h*y+r),fill=(255,225,224,255))
  d.ellipse((w*.5-r,h*.5-r,w*.5+r,h*.5+r),fill=(235,185,74,255))
 if mat=='meadow_fox_tail' and face in ('west','east','up'):
  for k in range(4):
   x=w*(.15+k*.22);d.line([(x,h*.2),(x+w*.05,h*.45),(x,h*.7)],fill=(210,143,92,255),width=max(1,w//80))
 if mat in ('bramble_bark','bramble_moss'):
  for k in range(1,5):
   x=w*k/5;d.line([(x,0),(x-w*.03,h*.3),(x+w*.04,h*.6),(x,h-1)],fill=(*tint(base,-24),255),width=max(1,w//90))
  if mat=='bramble_bark' and face in ('west','east','north','south'):
   d.line([(0,h*.78),(w*.3,h*.58),(w*.56,h*.65),(w,h*.33)],fill=(117,155,72,255),width=max(1,w//60))
 if mat=='bramble_bark' and part=='head' and ci==0 and face in ('north','south'):
  for x in (.3,.7):d.polygon([(w*(x-.1),h*.35),(w*(x+.1),h*.39),(w*(x+.08),h*.48),(w*(x-.08),h*.45)],fill=(230,192,91,255))
 if mat=='bramble_core' and face in ('north','south'):
  d.line([(w*.5,h*.12),(w*.78,h*.5),(w*.5,h*.88),(w*.22,h*.5),(w*.5,h*.12)],fill=(255,217,124,255),width=max(1,w//30))
 return image

def build(i):return bake(f'wild_0_{i}',f'w0_{i}_',DESIGNS[i](),paint)
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 for i in range(3):
  for path,data in build(i).items():
   if a.write:path.write_bytes(data)
   elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Grassland individual art stale: '+str(path))
 print('Three grassland wildlife individual prototypes: 12 files '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
