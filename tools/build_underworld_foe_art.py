#!/usr/bin/env python3
"""Individually authored underground-garden foe prototypes; no gameplay edits.

Atlas artwork is procedural, not a finished painting. Geometry and material
choices below are independent designs, even where joints use the same helper.
"""
import argparse
from PIL import ImageDraw
from build_forest_wild_art import c,bone,bake,PALETTE,surface,tint
from refine_mob_anatomy import refine_baked
PALETTE.update({
 'ug_stone':(63,55,75),'ug_dark':(36,32,49),'ug_ridge':(97,77,113),'ug_crystal':(155,117,197),'ug_bright':(205,171,230),
 'ug_shell':(72,56,91),'ug_chitin':(47,39,64),'ug_gold':(178,151,122),'ug_fur':(75,65,91),
 'ug_fungus':(118,102,149),'ug_spore':(167,188,164),'ug_pale':(197,205,189),'ug_web':(131,120,153),
 'ug_wing':(98,85,127),'ug_membrane':(145,122,166),'ug_eye':(202,163,233), 'ug_clock':(182,158,198),
})

def arthropod_legs(b,count,halfwidth,spread,zs,level,mat='ug_chitin',foot='ug_stone'):
 """Create segmented legs at authored anchors; z-spread and proportions vary."""
 for i in range(count):
  sign=-1 if i%2==0 else 1;z=zs[i//2];inner=halfwidth-.2
  start=-spread if sign<0 else inner;length=spread-inner
  tip=-spread-.45 if sign<0 else spread-.45
  b.append(bone(f'leg_{i}',[sign*inner,level,z],[c([start,level-.5,z-.5],[length,1,1],mat)],'body'))
  b.append(bone(f'tip_{i}',[sign*(spread-.4),level,z],[c([tip,.5,z-.45],[.9,level,.9],mat),c([tip-.18,0,z-.8],[1.26,.7,1.6],foot)],f'leg_{i}'))

def legs4(b,positions,height,mat='ug_fur',feet='ug_dark',wide=1.25):
 for i,(x,z) in enumerate(positions):
  b.append(bone(f'leg_{i}',[x,height-.2,z],[c([x-wide/2,.5,z-.6],[wide,height,1.2],mat),c([x-wide/2-.1,0,z-1],[wide+.2,.7,1.8],feet)],'body'))

def arms(b,half,height,low,width,mat='ug_stone',fist='ug_dark'):
 for side,sign in [('l',-1),('r',1)]:
  x=-half-width+.1 if sign<0 else half-.1
  b.append(bone('arm_'+side,[sign*half,height,0],[c([x,low,-2],[width,height-low+.2,4],mat)],'body'))
  b.append(bone('fist_'+side,[sign*(half+width*.5),low+.1,0],[c([x-.15,low-2.4,-2.3],[width+.3,2.7,4.6],fist)],'arm_'+side))

def tunnel_grub():
 # A long, jointed low tunneller, three plates and a pointed drill snout.
 b=[bone('body',[0,3.4,0],[c([-2.5,2,-3],[5,3.5,7],'ug_shell'),c([-2.8,4.8,-2.8],[5.6,1,6.6],'ug_ridge')]),
    bone('head',[0,3.6,-2.7],[c([-2,2.1,-5.7],[4,2.8,3.1],'ug_dark'),c([-1.25,2.5,-7.3],[2.5,1.8,1.9],'ug_crystal'),c([-.5,2.8,-8.2],[1,1,1.1],'ug_bright')],'body'),
    bone('abdomen',[0,3.5,3.5],[c([-2.4,2.1,3.5],[4.8,3.4,3.5],'ug_shell'),c([-2.6,4.9,3.7],[5.2,.9,3],'ug_ridge')],'body'),
    bone('tail',[0,3.4,6.7],[c([-1.8,2.1,6.6],[3.6,2.9,2.8],'ug_chitin'),c([-1.5,4.7,6.8],[3,.8,2.1],'ug_crystal')],'abdomen'),
    bone('crystal',[0,5.5,1],[c([-.8,5.4,0],[1.6,2,2],'ug_crystal'),c([-.4,7.2,.4],[.8,1.2,1.2],'ug_bright')],'body')]
 arthropod_legs(b,6,2.5,4.2,[-1.7,.3,2.4],2.2)
 return b

def spore_spider():
 # Large mushroom canopy on a short spider body with clustered side gills.
 b=[bone('body',[0,4,0],[c([-2.8,2.2,-2.5],[5.6,3.5,5.8],'ug_chitin'),c([-3.5,2,2],[7,4.1,5.5],'ug_fur')]),
    bone('head',[0,4,-2],[c([-2.2,2.5,-5.4],[4.4,2.8,3.2],'ug_dark'),c([-1.8,1.8,-5.8],[1,1.2,1.1],'ug_pale'),c([.8,1.8,-5.8],[1,1.2,1.1],'ug_pale')],'body'),
    bone('mushroom',[0,6,3],[c([-1,5.7,2.5],[2,2,2],'ug_pale'),c([-3.9,7.5,.2],[7.8,1.3,6.8],'ug_fungus'),c([-3,8.6,.9],[6,.8,5.4],'ug_spore'),c([-1.8,9.3,1.9],[3.6,.6,3.4],'ug_fungus')],'body'),
    bone('spore_l',[-1.8,5,6],[c([-2.4,5.7,5.4],[1.4,1,1.4],'ug_spore')],'body'),
    bone('spore_r',[1.4,5,6],[c([.8,5.7,5.4],[1.4,1.3,1.4],'ug_spore')],'body')]
 arthropod_legs(b,8,2.8,5.5,[-1.6,.2,2.2,4],3.2,foot='ug_fungus')
 return b

def crystal_ogre():
 # Broad asymmetrical shoulders, split crystal ridge and heavy hands.
 b=[bone('body',[0,10,0],[c([-4.3,5,-2.8],[8.6,8.3,5.6],'ug_stone'),c([-4.6,10,-3],[9.2,2.5,6],'ug_ridge'),c([-1.2,7,-3.25],[2.4,2.3,.7],'ug_crystal')]),
    bone('head',[0,13.5,0],[c([-2.8,13,-2.5],[5.6,4.2,4.6],'ug_dark'),c([-2.4,16.9,-2],[4.8,1,3.8],'ug_stone')],'body'),
    bone('vein',[0,13,1],[c([-.9,12.8,1],[1.8,3.4,1.8],'ug_crystal'),c([-.45,15.9,1.4],[.9,2,1],'ug_bright')],'body'),
    bone('shoulder',[3.6,12,0],[c([3.5,11,-2.5],[3,2.9,5],'ug_ridge'),c([4.2,13.5,-1.7],[1.5,2.1,2],'ug_crystal')],'body')]
 arms(b,4.2,12,7,3.4);legs4(b,[(-2.1,0),(2.1,0)],5,'ug_stone','ug_dark',2.8)
 return b

def shell_king():
 # High arched carapace, branching jaw horns, six legs, crystalline crown.
 b=[bone('body',[0,4,0],[c([-3.5,2,-3.2],[7,3.7,8.7],'ug_chitin'),c([-3.8,5.3,-2.9],[7.6,1.2,8],'ug_shell')]),
    bone('head',[0,4,-3],[c([-2.5,2.4,-5.8],[5,3.1,3.2],'ug_dark'),c([-1.8,2.2,-7.1],[1,1,1.7],'ug_gold'),c([.8,2.2,-7.1],[1,1,1.7],'ug_gold')],'body'),
    bone('shell_l',[-.2,6,0],[c([-3.8,6,-2.6],[3.8,1.2,7.5],'ug_ridge'),c([-3.3,7,-2.1],[3,1.2,6.3],'ug_shell')],'body'),
    bone('shell_r',[.2,6,0],[c([0,6,-2.6],[3.8,1.2,7.5],'ug_ridge'),c([.3,7,-2.1],[3,1.2,6.3],'ug_shell')],'body'),
    bone('crown',[0,8,1],[c([-2,8,-.2],[4,.8,3],'ug_gold'),c([-1.8,8.6,.2],[.9,2.6,1.2],'ug_crystal'),c([-.5,8.6,.2],[1,3.5,1.2],'ug_bright'),c([.9,8.6,.2],[.9,2.6,1.2],'ug_crystal')],'body')]
 arthropod_legs(b,6,3.5,5.8,[-1.8,.4,2.8],3)
 return b

def tail_hunter():
 # Low, long-faced quadruped; three-link tail terminates in a crystal hook.
 b=[bone('body',[0,6.5,0],[c([-2.4,4.2,-3.1],[4.8,4.3,8.1],'ug_fur'),c([-2.7,7,-3],[5.4,1.9,3],'ug_ridge')]),
    bone('head',[0,7,-2.9],[c([-1.9,6,-6.2],[3.8,3.1,3.8],'ug_fur'),c([-.9,6,-8],[1.8,1.2,2.1],'ug_dark'),c([-1.7,8.7,-5.3],[1,1.7,1],'ug_crystal'),c([.7,8.7,-5.3],[1,1.7,1],'ug_crystal')],'body'),
    bone('tail',[0,6.5,4.7],[c([-.8,5.7,4.6],[1.6,1.7,3.2],'ug_fur')],'body'),
    bone('tail_mid',[0,6.6,7.5],[c([-.7,6,7.3],[1.4,1.4,3.1],'ug_ridge')],'tail'),
    bone('tail_tip',[0,6.6,10],[c([-1.3,5.6,9.8],[2.6,2.1,2.9],'ug_crystal'),c([-.6,5.9,12.4],[1.2,1.2,1.7],'ug_bright')],'tail_mid')]
 legs4(b,[(-1.7,-1.8),(1.7,-1.8),(-1.7,3.7),(1.7,3.7)],4.5)
 return b

def spore_moth():
 # Moth-like upright head with antennae, two wide patterned wing lobes.
 b=[bone('body',[0,5.5,0],[c([-2,3,-2.6],[4,5.3,5.3],'ug_fur'),c([-1.5,2.8,2],[3,2,3.3],'ug_fungus')]),
    bone('head',[0,7.7,-2],[c([-1.8,7,-4.8],[3.6,3.1,3.1],'ug_dark'),c([-1.5,9.8,-3.8],[.5,2.5,.5],'ug_spore'),c([1,9.8,-3.8],[.5,2.5,.5],'ug_spore')],'body'),
    bone('spore_sac',[0,8,1],[c([-1.1,7.9,0],[2.2,1.4,2.5],'ug_spore'),c([-.7,9.1,.5],[1.4,1,1.4],'ug_pale')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-6.4 if sign<0 else 1.8;tip=-9 if sign<0 else 5.8
  b.append(bone('wing_'+side,[sign*1.8,7,0],[c([x,6.6,-2],[4.6,.75,5.3],'ug_wing'),c([x,6.4,2.5],[4.6,.5,2.4],'ug_fungus')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*5.8,7,0],[c([tip,6.5,-1.3],[3.2,.6,5],'ug_membrane'),c([tip,6.3,2.7],[3.2,.45,1.8],'ug_spore')],'wing_'+side))
 legs4(b,[(-.9,.3),(.9,.3)],3,'ug_dark','ug_pale',.7)
 return b

def abyss_spider():
 # Tall narrow abdomen and angular, long pendant legs, no fungal canopy.
 b=[bone('body',[0,6,0],[c([-2.2,4.8,-2.2],[4.4,2.8,5.1],'ug_dark'),c([-2.5,3.8,2.5],[5,4.5,6.1],'ug_chitin')]),
    bone('head',[0,6,-2],[c([-1.8,5,-5.1],[3.6,2.7,3.1],'ug_stone'),c([-1.2,4.2,-5.7],[.7,1.5,1.2],'ug_bright'),c([.5,4.2,-5.7],[.7,1.5,1.2],'ug_bright')],'body'),
    bone('ridge',[0,8,4],[c([-.9,8,2.9],[1.8,2.3,3.7],'ug_ridge'),c([-.45,10,3.7],[.9,1.5,2],'ug_crystal')],'body'),
    bone('spinner',[0,5,8],[c([-1,4.5,8],[2,1.4,2.2],'ug_web')],'body')]
 arthropod_legs(b,8,2.3,7.5,[-1.5,.2,2,4],5.3,'ug_dark','ug_ridge')
 return b

def clock_hare():
 b=[bone('body',[0,4,0],[c([-2.5,2,-2.7],[5,4.2,6.8],'ug_fur'),c([-2.1,1.7,-2],[4.2,.6,5.4],'ug_pale')]),
    bone('head',[0,5.8,-2.4],[c([-1.9,4.6,-5.5],[3.8,3.4,3.6],'ug_fur'),c([-.8,4.6,-6.5],[1.6,1,1.3],'ug_pale')],'body'),
    bone('dial',[0,6,1],[c([-1.8,6,-.6],[3.6,.7,3.6],'ug_clock'),c([-.7,6.6,.2],[1.4,.7,1.9],'ug_crystal')],'body'),
    bone('tail',[0,4,4],[c([-.8,3.7,3.9],[1.6,1.6,1.5],'ug_pale')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-1.7 if sign<0 else .6
  b.append(bone('ear_'+side,[sign*1.2,7.6,-4],[c([x,7.5,-4.8],[1.1,4.7,1.3],'ug_fur'),c([x+.2,8,-5],[.7,3.3,.3],'ug_crystal')],'head'))
 legs4(b,[(-1.5,-1.3),(1.5,-1.3),(-1.7,2.8),(1.7,2.8)],2.6,'ug_fur','ug_dark')
 return b

def tunnel_king():
 # Long segmented burrower with paired digging mandibles and crystal jaws.
 b=[bone('body',[0,4,0],[c([-3,2.2,-3],[6,3.8,8],'ug_dark'),c([-3.3,5.5,-2.6],[6.6,1,7.2],'ug_stone')]),
    bone('head',[0,4,-2.7],[c([-2.5,2.2,-5.7],[5,3.3,3.2],'ug_ridge'),c([-1.5,2.2,-7.5],[3,1.8,2],'ug_dark')],'body'),
    bone('jaw_l',[-2,3.3,-5],[c([-3.3,1.8,-7.8],[1.5,1.6,3.2],'ug_gold'),c([-3.4,2,-8.7],[1.2,1.2,1.2],'ug_crystal')],'head'),
    bone('jaw_r',[2,3.3,-5],[c([1.8,1.8,-7.8],[1.5,1.6,3.2],'ug_gold'),c([2.2,2,-8.7],[1.2,1.2,1.2],'ug_crystal')],'head'),
    bone('rear',[0,4,4.5],[c([-2.8,2.4,4.3],[5.6,3.5,3.6],'ug_shell'),c([-2.9,5.5,4.6],[5.8,1,3],'ug_ridge')],'body'),
    bone('tail',[0,4,7.5],[c([-1.8,2.8,7.5],[3.6,2.6,2.6],'ug_chitin')],'rear'),
    bone('crystals',[0,6,1],[c([-1.9,6,.1],[3.8,1,2.6],'ug_ridge'),c([-1.6,6.8,.5],[1.1,2.8,1.2],'ug_crystal'),c([.4,6.8,.5],[1.1,2,1.2],'ug_bright')],'body')]
 arthropod_legs(b,6,3,5.5,[-1.7,.5,3],2.8,'ug_chitin','ug_gold')
 return b

def eye_spider():
 # Low and broad silhouette with a large forward-facing central eye turret.
 b=[bone('body',[0,4,0],[c([-3.4,2.2,-2.4],[6.8,3.2,5.1],'ug_shell'),c([-4,1.8,2],[8,3.9,5.6],'ug_dark'),c([-3.7,5.4,2.4],[7.4,.6,4.8],'ug_ridge')]),
    bone('head',[0,4,-2.2],[c([-2.8,2.1,-5.4],[5.6,3.3,3.2],'ug_dark'),c([-1.8,2.6,-5.9],[3.6,2.3,.7],'ug_eye')],'body'),
    bone('eye_turret',[0,5.5,1.2],[c([-1.7,5.2,-.2],[3.4,1.7,2.8],'ug_stone'),c([-.9,6.7,.4],[1.8,1.6,1.6],'ug_crystal')],'body'),
    bone('spinner',[0,3.5,7],[c([-1.2,2.8,7],[2.4,1.4,1.9],'ug_web')],'body')]
 arthropod_legs(b,8,3.4,6.4,[-1.5,.2,2,4],2.6,'ug_shell','ug_bright')
 return b

def echo_ogre():
 # Tall narrow torso with split resonating horns and exposed central core.
 b=[bone('body',[0,10,0],[c([-3.3,5,-2.3],[6.6,9,4.6],'ug_dark'),c([-3.7,11,-2.7],[7.4,2,5.4],'ug_stone'),c([-1.3,7.5,-2.8],[2.6,2.8,.8],'ug_bright')]),
    bone('head',[0,14,0],[c([-2.5,13.5,-2.1],[5,3.9,4.2],'ug_stone'),c([-2.8,17,-1.9],[5.6,.9,3.8],'ug_ridge')],'body'),
    bone('horn_l',[-1.8,17,0],[c([-3,17,-1],[1.3,3.3,1.4],'ug_crystal'),c([-3.8,19.7,-1],[1.4,1.2,1.4],'ug_bright')],'head'),
    bone('horn_r',[1.8,17,0],[c([1.7,17,-1],[1.3,3.3,1.4],'ug_crystal'),c([2.4,19.7,-1],[1.4,1.2,1.4],'ug_bright')],'head'),
    bone('resonator',[0,13,1.4],[c([-2.7,12.5,1.4],[5.4,1,1.4],'ug_ridge'),c([-2.2,13.3,1.4],[1,2,1.4],'ug_crystal'),c([1.2,13.3,1.4],[1,2,1.4],'ug_crystal')],'body')]
 arms(b,3.2,12,7,2.4,'ug_stone','ug_ridge');legs4(b,[(-1.7,0),(1.7,0)],5,'ug_dark','ug_ridge',2.4)
 return b

def ore_bat():
 # Bat, with swept angular membranes, ears, mineral back ridge and two feet.
 b=[bone('body',[0,6,0],[c([-1.9,3.5,-2.5],[3.8,4.8,5.1],'ug_dark'),c([-1.4,3.2,1.6],[2.8,1.8,2.4],'ug_ridge')]),
    bone('head',[0,8,-2],[c([-1.7,7,-4.7],[3.4,3.1,3],'ug_fur'),c([-1.7,9.6,-4],[1,2.3,1],'ug_crystal'),c([.7,9.6,-4],[1,2.3,1],'ug_crystal'),c([-.8,7,-5.4],[1.6,1,1],'ug_pale')],'body'),
    bone('mineral',[0,8,1],[c([-1.1,8,-.2],[2.2,1.4,2.4],'ug_ridge'),c([-.6,9.2,.2],[1.2,1.8,1.3],'ug_crystal')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  # Folded hanging wings differentiate this bat from the spread-wing moth.
  x=-3.3 if sign<0 else 1.7;tip=-4.1 if sign<0 else 2.7
  b.append(bone('wing_'+side,[sign*1.7,7,0],[c([x,4,-1.8],[1.6,3.4,4.3],'ug_membrane'),c([x,6.8,-2],[1.6,.7,4.6],'ug_dark')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*3,4.5,0],[c([tip,2.8,-1.5],[1.4,1.9,3.8],'ug_wing'),c([tip,2.6,1.7],[1.4,.6,.7],'ug_crystal')],'wing_'+side))
 legs4(b,[(-.9,.4),(.9,.4)],3.5,'ug_dark','ug_gold',.7)
 return b

DESIGNS=[tunnel_grub,spore_spider,crystal_ogre,shell_king,tail_hunter,spore_moth,abyss_spider,clock_hare,tunnel_king,eye_spider,echo_ogre,ore_bat]

def paint(mat,w,h,seed,face,part,ci):
 im=surface(mat,w,h,seed,face,'no_generic_eye',ci);d=ImageDraw.Draw(im);base=PALETTE[mat]
 if mat in ('ug_stone','ug_ridge','ug_shell'):
  for k in range(1,4):
   x=w*k/4;d.line([(x,0),(x-w*.08,h*.32),(x+w*.025,h*.58),(x-w*.04,h)],fill=(*tint(base,-24),255),width=max(1,w//75))
 if mat in ('ug_crystal','ug_bright','ug_eye'):
  d.line([(w*.13,h*.82),(w*.48,h*.12),(w*.86,h*.82)],fill=(*tint(base,30),255),width=max(1,w//60))
  d.line((w*.48,h*.12,w*.5,h*.9),fill=(*tint(base,-30),255),width=max(1,w//85))
 if mat in ('ug_fungus','ug_spore'):
  for x,y in ((.2,.28),(.6,.18),(.77,.62),(.35,.7)):
   r=max(1,min(w,h)*.08);d.ellipse((w*x-r,h*y-r,w*x+r,h*y+r),fill=(*tint(base,27),255))
 if mat in ('ug_membrane','ug_wing'):
  for k in range(1,5):
   x=w*k/5;d.line([(0,h*.08),(x,h*.55),(x+w*.04,h)],fill=(*tint(base,-26),255),width=max(1,w//70))
 if mat=='ug_clock' and face=='up':
  d.ellipse((w*.19,h*.16,w*.81,h*.84),outline=(83,64,101,255),width=max(1,w//22));d.line([(w*.5,h*.22),(w*.5,h*.5),(w*.7,h*.63)],fill=(83,64,101,255),width=max(1,w//22))
 if part=='head' and ci==0 and face in ('west','east'):
  d.polygon([(w*.22,h*.3),(w*.66,h*.34),(w*.58,h*.5),(w*.3,h*.47)],fill=(22,22,35,255))
  d.polygon([(w*.3,h*.35),(w*.58,h*.38),(w*.54,h*.45),(w*.33,h*.44)],fill=(220,194,237,255))
 if part=='head' and ci==0 and face=='north':
  for x in (.3,.7):d.rectangle((w*(x-.08),h*.32,w*(x+.08),h*.46),fill=(218,185,235,255))
 if mat=='ug_eye' and face=='north':
  d.ellipse((w*.21,h*.15,w*.79,h*.85),fill=(91,56,119,255));d.ellipse((w*.34,h*.25,w*.66,h*.75),fill=(225,197,246,255));d.ellipse((w*.45,h*.3,w*.55,h*.7),fill=(35,22,49,255))
 return im

def material(mat):
 # Emission/metal interpretation varies by renderer; no claim of illumination.
 return (0,90,180,255) if mat in ('ug_spore','ug_eye') else (0,0,190,255)
def build(i):
 name=f'foe_5_{i}'
 return refine_baked(name,bake(name,f'f5_{i}_',DESIGNS[i](),paint,material))
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 for i in range(len(DESIGNS)):
  for path,data in build(i).items():
   if a.write:path.write_bytes(data)
   elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Underworld foe art stale: '+str(path))
 print(f'{len(DESIGNS)} underworld foe prototypes: {len(DESIGNS)*4} files '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
