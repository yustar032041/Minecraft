#!/usr/bin/env python3
"""Three independently designed desert wildlife appearances; not finished art.

Geometry is authored per creature; texture baking is shared with the forest
prototypes. Only the named geometry and color/MER/normal files are generated.
No vanilla or protected assets, AI, collision or combat data are changed.
"""
import argparse
from build_forest_wild_art import c,bone,bake,PALETTE
PALETTE.update({
 'rabbit_fur':(187,150,103),'rabbit_belly':(225,208,172),'rabbit_ear':(194,142,125),'rabbit_tail':(233,217,186),
 'beetle_shell':(159,116,65),'beetle_plate':(193,157,99),'beetle_body':(81,65,52),'beetle_limb':(105,77,54),'beetle_horn':(220,180,113),
 'statue_stone':(143,79,56),'statue_plate':(188,116,74),'statue_dark':(98,61,51),'statue_accent':(224,177,105),
})

def rabbit():
 b=[bone('body',[0,4,0],[c([-2.8,2.8,-2.5],[5.6,4.2,6.8],'rabbit_fur'),c([-2,2.5,-1.8],[4,.6,5],'rabbit_belly')]),
    bone('head',[0,6,-2.5],[c([-2,5,-5.8],[4,3.5,3.8],'rabbit_fur'),c([-1,5,-6.9],[2,1.2,1.2],'rabbit_belly')],'body'),
    bone('ear_l',[-1.2,8,-4],[c([-1.8,8,-4.8],[1.2,4.8,1.4],'rabbit_fur'),c([-1.6,8.6,-5],[.8,3.5,.3],'rabbit_ear')],'head'),
    bone('ear_r',[1.2,8,-4],[c([.6,8,-4.8],[1.2,5.2,1.4],'rabbit_fur'),c([.8,8.7,-5],[.8,3.8,.3],'rabbit_ear')],'head'),
    bone('tail',[0,5,4],[c([-1,4,4],[2,2,1.8],'rabbit_tail')],'body')]
 for i,(x,z) in enumerate([(-1.7,-1.4),(1.7,-1.4),(-1.9,3),(1.9,3)]):
  w=1.2 if i<2 else 1.8
  b.append(bone('leg_'+str(i),[x,3.3,z],[c([x-w/2,.6,z-.7],[w,3,1.4],'rabbit_fur'),c([x-w/2,0,z-1.2],[w,.8,2],'rabbit_belly')],'body'))
 return b

def beetle():
 b=[bone('body',[0,3,0],[c([-3.4,1.4,-3],[6.8,3,7.6],'beetle_body')]),
    bone('shell_l',[-.15,4,0],[c([-3.3,4,-2.6],[3.3,1.2,7.1],'beetle_shell'),c([-2.8,5.1,-1.8],[2.7,.6,5.4],'beetle_plate')],'body'),
    bone('shell_r',[.15,4,0],[c([0,4,-2.6],[3.3,1.2,7.1],'beetle_shell'),c([.1,5.1,-1.8],[2.7,.6,5.4],'beetle_plate')],'body'),
    bone('head',[0,3,-3],[c([-2.5,2,-5.2],[5,2.7,2.6],'beetle_body'),c([-.7,3.9,-6.6],[1.4,1,1.7],'beetle_horn')],'body'),
    bone('antenna_l',[-1.7,4,-4],[c([-2.2,4,-5.1],[.6,1.5,.6],'beetle_limb'),c([-2.5,5.2,-5.3],[1.1,.5,1],'beetle_horn')],'head'),
    bone('antenna_r',[1.7,4,-4],[c([1.6,4,-5.1],[.6,1.5,.6],'beetle_limb'),c([1.4,5.2,-5.3],[1.1,.5,1],'beetle_horn')],'head')]
 for i in range(6):
  side=-1 if i%2==0 else 1;z=(-2,0,2)[i//2];x=side*3
  ox=-5.6 if side<0 else 2.8;footx=-6.1 if side<0 else 4.8
  b.append(bone('leg_'+str(i),[x,2.8,z],[c([ox,2,z-.4],[2.8,.9,.8],'beetle_limb')],'body'))
  b.append(bone('foot_'+str(i),[side*5,2.5,z],[c([footx,.2,z-.5],[1.3,2.4,1],'beetle_limb')],'leg_'+str(i)))
 return b

def statue():
 b=[bone('body',[0,10,0],[c([-4.4,6,-2.8],[8.8,8,5.6],'statue_stone'),c([-3.6,11,-3.4],[7.2,2,.8],'statue_plate'),c([-2,7,-3.5],[4,3,.8],'statue_dark')]),
    bone('core',[0,9,-3.5],[c([-1.2,8,-3.9],[2.4,2, .6],'statue_accent')],'body'),
    bone('head',[0,14,-.5],[c([-3.1,13.7,-3.3],[6.2,4.7,5.4],'statue_stone'),c([-3.5,17.8,-2.8],[7,1,4.5],'statue_plate'),c([-1,18.6,-2],[2,1.5,2],'statue_accent')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-6.8 if sign<0 else 4.1
  b.append(bone('arm_'+side,[sign*4.3,13,0],[c([x,7,-2],[2.7,6.5,4],'statue_stone'),c([x-.25 if sign<0 else x,11,-2.4],[2.95,2.3,4.8],'statue_plate')],'body'))
  b.append(bone('forearm_'+side,[sign*5.45,7,0],[c([x,4.3,-2.2],[2.7,2.9,4.4],'statue_dark'),c([x-.2,4,-2.4],[3.1,1,4.8],'statue_plate')],'arm_'+side))
 for i,x in enumerate((-2.3,2.3)):
  b.append(bone('leg_'+str(i),[x,7,0],[c([x-1.4,1,-1.6],[2.8,6,3.2],'statue_stone'),c([x-1.6,0,-2],[3.2,1.5,4],'statue_dark')],'body'))
 return b

DESIGNS=[rabbit,beetle,statue]
def build(i):return bake(f'wild_2_{i}',f'w2_{i}_',DESIGNS[i]())
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 for i in range(3):
  for path,data in build(i).items():
   if a.write:path.write_bytes(data)
   elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Desert wildlife art stale: '+str(path))
 print('Three desert wildlife prototypes: 12 files '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
