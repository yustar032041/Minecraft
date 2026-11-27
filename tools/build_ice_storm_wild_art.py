#!/usr/bin/env python3
"""Six individually authored ice-lake and thunder-cliff wildlife prototypes.

Geometry is authored per creature. Shared atlas baking draws procedural material
studies, not finished painted textures. No behavior/collision/drops are touched.
"""
import argparse
from build_forest_wild_art import c,bone,bake,PALETTE
from refine_mob_anatomy import refine_baked
PALETTE.update({
 'ice_fox_fur':(207,220,219),'ice_fox_shadow':(159,182,188),'ice_fox_tip':(237,243,236),'ice_fox_ear':(163,183,192),
 'ice_deer_fur':(156,183,190),'ice_deer_belly':(215,228,222),'ice_antler':(155,216,229),'ice_hoof':(93,131,147),
 'ice_wolf_fur':(135,156,174),'ice_wolf_mane':(178,198,206),'ice_wolf_muzzle':(216,226,224),'ice_claw':(136,213,226),
 'storm_bird_fur':(104,91,80),'storm_feather':(161,112,70),'storm_bird_beak':(209,174,99),'storm_bird_leg':(77,73,69),
 'storm_goat_fur':(154,155,146),'storm_goat_mane':(203,201,184),'storm_horn':(116,102,79),'storm_hoof':(79,80,82),
 'storm_rock':(80,85,94),'storm_plate':(116,122,130),'storm_joint':(57,62,71),'storm_rune':(226,185,78),
})

def fox():
 b=[bone('body',[0,5,0],[c([-2.5,3.8,-3],[5,4.2,7.5],'ice_fox_fur'),c([-2.1,3.4,-2],[4.2,.7,5.5],'ice_fox_shadow')]),
    bone('head',[0,6,-2.5],[c([-2.1,5,-5.8],[4.2,3.5,3.7],'ice_fox_fur'),c([-1.1,5,-7.2],[2.2,1.4,1.7],'ice_fox_tip'),c([-1.9,8.2,-5.2],[1.1,1.8,1.2],'ice_fox_ear'),c([.8,8.2,-5.2],[1.1,1.8,1.2],'ice_fox_ear')],'body'),
    bone('tail',[0,6,4],[c([-1.6,4.5,4],[3.2,3,3.2],'ice_fox_fur')],'body'),
    bone('tail_plume',[0,6,6.8],[c([-2.2,4.1,6.8],[4.4,4,3.2],'ice_fox_shadow'),c([-1.9,4.3,9.6],[3.8,3.6,1.6],'ice_fox_tip')],'tail')]
 for i,(x,z) in enumerate([(-1.7,-1.8),(1.7,-1.8),(-1.7,3.2),(1.7,3.2)]):
  b.append(bone('leg_'+str(i),[x,4.4,z],[c([x-.65,0,z-.7],[1.3,4.5,1.4],'ice_fox_fur'),c([x-.75,0,z-1],[1.5,.7,1.8],'ice_fox_shadow')],'body'))
 return b

def deer():
 b=[bone('body',[0,9,0],[c([-2.9,8,-3.5],[5.8,4.8,8.8],'ice_deer_fur'),c([-2.4,7.5,-2.8],[4.8,.8,7],'ice_deer_belly')]),
    bone('neck',[0,10,-2.8],[c([-1.7,9.5,-4.7],[3.4,4.5,2.4],'ice_deer_fur')],'body'),
    bone('head',[0,13,-4],[c([-2,12,-6.9],[4,3.6,3.5],'ice_deer_fur'),c([-1.1,12,-8.5],[2.2,1.4,1.9],'ice_deer_belly')],'neck'),
    bone('tail',[0,10,5],[c([-.8,9.5,5],[1.6,1.5,2],'ice_deer_belly')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=sign*1.35
  # Branches overlap the stem and the top of the head.
  b.append(bone('antler_'+side,[x,15,-5],[c([x-.45,15,-5.5],[.9,4.3,1],'ice_antler'),c([-3.5 if sign<0 else 1.2,18,-5.4],[2.3,.7,.8],'ice_antler'),c([-3.5 if sign<0 else 2.8,18,-5.4],[.7,1.6,.8],'ice_antler')],'head'))
 for i,(x,z) in enumerate([(-2,-2),(2,-2),(-2,4),(2,4)]):
  b.append(bone('leg_'+str(i),[x,8.2,z],[c([x-.55,4.2,z-.6],[1.1,4.1,1.2],'ice_deer_fur')],'body'))
  b.append(bone('shin_'+str(i),[x,4.3,z],[c([x-.45,.8,z-.5],[.9,3.6,1],'ice_deer_fur'),c([x-.65,0,z-.8],[1.3,1,1.6],'ice_hoof')],'leg_'+str(i)))
 return b

def wolf():
 b=[bone('body',[0,7,0],[c([-3,5.4,-3.5],[6,5,9],'ice_wolf_fur'),c([-3.4,6,-3.9],[6.8,5,3.7],'ice_wolf_mane')]),
    bone('head',[0,8,-3],[c([-2.3,7,-6.7],[4.6,3.7,4.3],'ice_wolf_fur'),c([-1.4,7,-9],[2.8,1.8,2.7],'ice_wolf_muzzle'),c([-2,10.3,-5.7],[1.2,1.9,1.4],'ice_wolf_mane'),c([.8,10.3,-5.7],[1.2,1.9,1.4],'ice_wolf_mane')],'body'),
    bone('tail',[0,8,5],[c([-1.2,7,5],[2.4,2.4,3],'ice_wolf_fur')],'body'),
    bone('tail_tip',[0,8,7.7],[c([-1.5,6.8,7.7],[3,2.8,2.5],'ice_wolf_mane')],'tail'),
    bone('ruff',[0,10,-2],[c([-2.8,10,-3.3],[5.6,1.2,3],'ice_wolf_mane'),c([-1.8,11,-2.7],[3.6,.8,1.6],'ice_wolf_mane')],'body')]
 for i,(x,z) in enumerate([(-2,-2),(2,-2),(-2,4),(2,4)]):
  b.append(bone('leg_'+str(i),[x,6,z],[c([x-.8,2.4,z-.8],[1.6,3.8,1.6],'ice_wolf_fur')],'body'))
  b.append(bone('paw_'+str(i),[x,2.5,z],[c([x-.75,.5,z-.75],[1.5,2,1.5],'ice_wolf_fur'),c([x-.95,0,z-1.15],[1.9,.7,2],'ice_claw')],'leg_'+str(i)))
 return b

def eagle():
 b=[bone('body',[0,6,0],[c([-3,4,-3.4],[6,5.2,7.8],'storm_bird_fur'),c([-2.5,3.5,-2.7],[5,.7,6],'storm_feather')]),
    bone('head',[0,8,-3],[c([-2.1,7,-6],[4.2,3.4,3.5],'storm_bird_fur'),c([-.8,7,-7.8],[1.6,1.4,2],'storm_bird_beak')],'body'),
    bone('tail',[0,6,4],[c([-2,5.5,4],[4,.8,3.5],'storm_feather'),c([-2.6,5.3,7],[5.2,.7,1.9],'storm_feather')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-7 if sign<0 else 2.8;tip=-10.8 if sign<0 else 6.8
  b.append(bone('wing_'+side,[sign*2.8,7,0],[c([x,6.2,-2.8],[4.2,1,6],'storm_bird_fur'),c([x,5.9,2.5],[4.2,.5,1.5],'storm_feather')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*6.8,6.7,0],[c([tip,6.3,-2.2],[4,0.8,5.5],'storm_feather'),c([tip,6,2.8],[3.5,.6,1.4],'storm_feather'),c([tip,5.9,3.9],[1.2,.5,1.6],'storm_feather'),c([tip+1.2,5.9,3.9],[1.2,.5,1.2],'storm_feather'),c([tip+2.4,5.9,3.9],[1.1,.5,.8],'storm_feather')],'wing_'+side))
 for i,x in enumerate((-1.4,1.4)):
  b.append(bone('leg_'+str(i),[x,4,1],[c([x-.5,.4,.5],[1,3.8,1],'storm_bird_leg'),c([x-.7,0,-.3],[1.4,.7,2],'storm_bird_beak')],'body'))
 return b

def goat():
 b=[bone('body',[0,9,0],[c([-3.3,7.7,-3.3],[6.6,5.6,8.4],'storm_goat_fur'),c([-3.1,12.7,-2.5],[6.2,1.1,5.8],'storm_goat_mane')]),
    bone('neck',[0,11,-3],[c([-2,9.5,-4.6],[4,4.6,2.5],'storm_goat_mane')],'body'),
    bone('head',[0,13,-4],[c([-2.2,11.8,-6.5],[4.4,3.8,3.4],'storm_goat_fur'),c([-1.2,11.8,-8],[2.4,1.5,1.8],'storm_goat_mane'),c([-.7,10.5,-6.5],[1.4,1.4,1.1],'storm_goat_mane')],'neck'),
    bone('tail',[0,10,5],[c([-.7,9.6,4.8],[1.4,1.4,1.8],'storm_goat_fur')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=sign*1.5;outer=-3.2 if sign<0 else 1.1
  b.append(bone('horn_'+side,[x,15,-4.5],[c([x-.5,15,-5],[1,2.7,1.1],'storm_horn'),c([outer,17,-5],[2.1,.9,1.1],'storm_horn'),c([-3.2 if sign<0 else 2.3,15.8,-5],[.9,2.1,1.1],'storm_horn')],'head'))
 for i,(x,z) in enumerate([(-2.3,-1.8),(2.3,-1.8),(-2.3,3.6),(2.3,3.6)]):
  b.append(bone('leg_'+str(i),[x,8,z],[c([x-.7,3.6,z-.7],[1.4,4.5,1.4],'storm_goat_fur')],'body'))
  b.append(bone('hoof_'+str(i),[x,3.7,z],[c([x-.6,.8,z-.6],[1.2,3,1.2],'storm_goat_fur'),c([x-.8,0,z-.9],[1.6,1.1,1.8],'storm_hoof')],'leg_'+str(i)))
 return b

def sentinel():
 b=[bone('body',[0,10,0],[c([-4.5,6,-2.8],[9,8,5.6],'storm_rock'),c([-3.5,10,-3.4],[7,3,.8],'storm_plate')]),
    bone('core',[0,10,-3],[c([-1.4,9.3,-3.8],[2.8,2.2,.8],'storm_rune')],'body'),
    bone('head',[0,14,0],[c([-3,13.8,-3.2],[6,4.6,5],'storm_rock'),c([-3.3,17.8,-2.6],[6.6,1,4],'storm_plate'),c([-.5,18.5,-1.8],[1,1.6,1.4],'storm_rune')],'body'),
    bone('back_spire',[0,13,1.4],[c([-.8,13.5,.7],[1.6,2.8,1.5],'storm_plate'),c([-.5,16,.9],[1,1.7,1.1],'storm_rune')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-7.2 if sign<0 else 4.2
  b.append(bone('arm_'+side,[sign*4.4,13,0],[c([x,7,-2],[3,6.4,4],'storm_rock'),c([x-.15,11.4,-2.5],[3.3,2,5],'storm_plate')],'body'))
  b.append(bone('fist_'+side,[sign*5.6,7,0],[c([x,4.1,-2.2],[3,3.1,4.4],'storm_joint'),c([x-.25,4,-2.4],[3.5,1.2,4.8],'storm_plate')],'arm_'+side))
 for i,x in enumerate((-2.3,2.3)):
  b.append(bone('leg_'+str(i),[x,7,0],[c([x-1.5,1,-1.6],[3,6,3.2],'storm_rock'),c([x-1.7,0,-2],[3.4,1.3,4],'storm_joint')],'body'))
 return b

DESIGNS={3:[fox,deer,wolf],4:[eagle,goat,sentinel]}
def build(realm,i):
 name=f'wild_{realm}_{i}'
 return refine_baked(name,bake(name,f'w{realm}_{i}_',DESIGNS[realm][i]()))
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 for realm in (3,4):
  for i in range(3):
   for path,data in build(realm,i).items():
    if a.write:path.write_bytes(data)
    elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Ice/storm wildlife art stale: '+str(path))
 print('Six ice/storm wildlife prototypes: 24 files '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
