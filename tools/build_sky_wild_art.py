#!/usr/bin/env python3
"""Three individually designed sky-island wildlife prototypes.

Draws procedural material studies; not final artwork. Writes only three models
and their existing maps, without changing gameplay, spawning or collision.
"""
import argparse,random
from PIL import ImageDraw
from build_forest_wild_art import c,bone,bake,PALETTE,surface,tint
PALETTE.update({
 'sky_bird_body':(182,203,212),'sky_bird_head':(211,224,226),'sky_feather':(230,235,228),'sky_bird_beak':(210,179,111),'sky_bird_foot':(116,127,129),
 'sky_goat_fur':(215,224,215),'sky_goat_wool':(239,238,222),'sky_goat_horn':(142,189,199),'sky_goat_hoof':(115,151,158),
 'sky_beast_body':(121,151,169),'sky_beast_head':(141,171,187),'sky_beast_mane':(201,219,219),'sky_beast_muzzle':(222,230,220),'sky_beast_paw':(94,127,147),
})

def bird():
 b=[bone('body',[0,5,0],[c([-2.2,3,-2.8],[4.4,4.2,6.5],'sky_bird_body'),c([-2.4,2.8,-1.8],[4.8,1.4,4],'sky_feather')]),
    bone('head',[0,6,-2],[c([-1.8,5.7,-4.7],[3.6,3.2,3.2],'sky_bird_head'),c([-.6,6,-6.1],[1.2,.9,1.6],'sky_bird_beak'),c([-.6,8.7,-3.3],[1.2,1.2,1.3],'sky_feather')],'body'),
    bone('tail',[0,4.8,3.4],[c([-1.2,4.2,3.2],[2.4,.8,2.8],'sky_feather'),c([-2.4,4,5.6],[4.8,.7,1.6],'sky_feather')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-5.8 if sign<0 else 2;tip=-8.6 if sign<0 else 5.5
  b.append(bone('wing_'+side,[sign*2,5.8,0],[c([x,5,-1.9],[3.8,.9,4.3],'sky_bird_body'),c([x,4.8,2],[3.8,.5,1.3],'sky_feather')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*5.5,5.5,0],[c([tip,5,-1.6],[3.1,.8,4.3],'sky_feather'),c([tip,4.8,2.4],[1.5,.5,1.2],'sky_feather'),c([tip+1.4,4.8,2.4],[1.4,.5,.9],'sky_feather')],'wing_'+side))
 for i,x in enumerate((-1,1)):
  b.append(bone('leg_'+str(i),[x,3,.5],[c([x-.35,.3,.2],[.7,2.8,.7],'sky_bird_foot'),c([x-.55,0,-.5],[1.1,.5,1.4],'sky_bird_beak')],'body'))
 return b

def goat():
 b=[bone('body',[0,6,0],[c([-2.8,5,-2.7],[5.6,4.5,6.9],'sky_goat_fur'),c([-2.5,8.8,-2],[5,1,5.5],'sky_goat_wool')]),
    bone('head',[0,8,-2.8],[c([-2,7,-5.5],[4,3.4,3.5],'sky_goat_fur'),c([-1,7,-6.8],[2,1.3,1.5],'sky_goat_wool'),c([-.55,6,-5.7],[1.1,1.3,1],'sky_goat_wool')],'body'),
    bone('tail',[0,7,4],[c([-.8,6.8,4],[1.6,1.5,1.6],'sky_goat_wool')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=sign*1.3;outer=-2.6 if sign<0 else 1
  b.append(bone('horn_'+side,[x,10,-4],[c([x-.4,10,-4.6],[.8,2.4,.9],'sky_goat_horn'),c([outer,11.6,-4.6],[1.6,.8,.9],'sky_goat_horn'),c([-2.6 if sign<0 else 1.9,11,-4.6],[.7,1.4,.9],'sky_goat_horn')],'head'))
 for i,(x,z) in enumerate([(-1.8,-1.5),(1.8,-1.5),(-1.8,3),(1.8,3)]):
  b.append(bone('leg_'+str(i),[x,5.2,z],[c([x-.6,2.1,z-.6],[1.2,3.1,1.2],'sky_goat_fur')],'body'))
  b.append(bone('hoof_'+str(i),[x,2.2,z],[c([x-.5,.5,z-.5],[1,1.7,1],'sky_goat_fur'),c([x-.7,0,z-.8],[1.4,.7,1.6],'sky_goat_hoof')],'leg_'+str(i)))
 return b

def beast():
 # Cloud-eater: heavy forequarters, cloud-like cheek ruff, shorter hindquarters
 # and a tufted articulated tail rather than the goat or bird hierarchy.
 b=[bone('body',[0,7,0],[c([-2.9,5,-3.2],[5.8,5,8.4],'sky_beast_body'),c([-3.5,5.5,-3.4],[7,5.4,3.6],'sky_beast_mane')]),
    bone('head',[0,8,-3],[c([-2.5,7,-6.5],[5,3.7,4],'sky_beast_head'),c([-1.6,7,-8.2],[3.2,1.7,2],'sky_beast_muzzle'),c([-2.3,10.2,-5.6],[1.1,1.4,1.2],'sky_beast_mane'),c([1.2,10.2,-5.6],[1.1,1.4,1.2],'sky_beast_mane')],'body'),
    bone('cloud_crest',[0,10,-2],[c([-2.6,10.5,-3],[5.2,1.2,3.5],'sky_beast_mane'),c([-1.8,11.4,-2.3],[3.6,1,2.2],'sky_beast_mane')],'body'),
    bone('tail',[0,7,4.8],[c([-.65,6.2,4.8],[1.3,1.4,3],'sky_beast_body')],'body'),
    bone('tail_tuft',[0,7,7.5],[c([-1.4,5.9,7.4],[2.8,2.1,2.5],'sky_beast_mane'),c([-1.1,6.2,9.6],[2.2,1.7,1],'sky_beast_muzzle')],'tail')]
 for i,(x,z) in enumerate([(-2.2,-2),(2.2,-2),(-1.8,3.8),(1.8,3.8)]):
  w=1.9 if i<2 else 1.4
  b.append(bone('leg_'+str(i),[x,6,z],[c([x-w/2,2.4,z-.7],[w,3.8,1.4],'sky_beast_body')],'body'))
  b.append(bone('paw_'+str(i),[x,2.5,z],[c([x-w*.45,.5,z-.6],[w*.9,2,1.2],'sky_beast_body'),c([x-w*.6,0,z-1.05],[w*1.2,.8,1.8],'sky_beast_paw')],'leg_'+str(i)))
 return b
DESIGNS=[bird,goat,beast]

def paint(mat,w,h,seed,face,part,ci):
 image=surface(mat,w,h,seed,face,part,ci);d=ImageDraw.Draw(image);base=PALETTE[mat]
 if mat in ('sky_goat_wool','sky_beast_mane') and face in ('up','west','east'):
  # Layered curls describe cloud and wool rather than sparse fur flecks.
  for row in range(2):
   for col in range(4):
    x=w*(.08+col*.22+(row%2)*.09);y=h*(.16+row*.38)
    d.arc((x,y,x+w*.2,y+h*.26),5,190,fill=(*tint(base,-24),255),width=max(1,w//90))
 if mat=='sky_goat_horn':
  d.line([(w*.2,h*.85),(w*.5,h*.2),(w*.8,h*.8)],fill=(207,235,230,255),width=max(1,w//60))
 if mat=='sky_beast_body' and part=='body' and ci==0 and face in ('west','east'):
  for n in range(2):
   d.arc((w*(.2+n*.16),h*(.24+n*.12),w*(.65+n*.16),h*(.62+n*.12)),185,345,fill=(194,220,223,255),width=max(2,w//55))
 return image

def build(i):return bake(f'wild_6_{i}',f'w6_{i}_',DESIGNS[i](),paint)
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 for i in range(3):
  for path,data in build(i).items():
   if a.write:path.write_bytes(data)
   elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Sky wildlife art stale: '+str(path))
 print('Three sky wildlife prototypes: 12 files '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
