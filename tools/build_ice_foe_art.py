#!/usr/bin/env python3
"""Hand-authored ice-lake foe geometry and procedural texture studies.

This script changes only the named model and color/MER/normal maps, not AI,
collision boxes, attack effects or timing. Drafts require Bedrock inspection.
"""
import argparse
from PIL import ImageDraw
from build_forest_wild_art import c,bone,bake,PALETTE,surface,tint
PALETTE.update({
 'owl_body':(126,153,164),'owl_belly':(203,220,218),'owl_head':(156,184,193),'owl_disc':(218,233,226),'owl_wing':(111,145,161),'owl_tip':(175,203,208),'owl_dark':(61,87,101),'owl_ice':(157,218,226),'owl_beak':(215,194,147),
 'lake_body':(129,180,191),'lake_head':(180,216,216),'lake_wing':(116,178,197),'lake_feather':(191,225,225),'lake_dark':(65,113,130),'lake_beak':(209,203,167),
 'prison_stone':(81,115,131),'prison_dark':(51,78,94),'prison_ice':(139,205,217),'prison_rim':(199,229,228),'prison_rune':(210,237,236),
 'thin_body':(75,111,123),'thin_shell':(123,173,183),'thin_rim':(191,222,220),'thin_crack':(91,145,158),'thin_claw':(58,89,104),
 'mirror_fur':(155,183,194),'mirror_head':(190,211,212),'mirror_dark':(81,116,134),'mirror_glass':(182,225,231),'mirror_muzzle':(226,235,229),
 'pillar_body':(109,145,160),'pillar_head':(156,190,199),'pillar_wing':(116,163,181),'pillar_feather':(188,218,220),'pillar_ice':(170,222,230),'pillar_dark':(65,101,118),
 'frost_spider':(105,145,159),'frost_spider_head':(139,181,190),'frost_spider_leg':(73,112,129),'frost_web':(206,234,231),'frost_fang':(195,222,220),
 'snow_hare':(208,225,220),'snow_hare_shadow':(152,184,193),'snow_hare_ear':(186,193,197),'snow_hare_dark':(94,132,148),'snow_hare_clock':(144,209,220),
 'white_body':(127,158,169),'white_dark':(70,104,120),'white_plate':(194,218,218),'white_horn':(220,239,232),'white_rune':(167,220,223),
 'frostbird_body':(86,129,149),'frostbird_belly':(205,226,224),'frostbird_head':(116,160,177),'frostbird_wing':(99,151,171),'frostbird_tip':(171,210,219),'frostbird_beak':(226,201,150),'frostbird_dark':(58,89,104),
 'avalanche_fur':(127,157,172),'avalanche_mane':(186,211,212),'avalanche_head':(145,178,188),'avalanche_claw':(197,225,222),'avalanche_dark':(67,99,116),
 'crystal_body':(87,120,137),'crystal_shell':(124,182,195),'crystal_plate':(176,219,222),'crystal_core':(210,238,234),'crystal_dark':(58,88,106),
})

def ice_owl():
 # Large owl is no longer a quadruped. Tall breast, forward face, folded
 # wings and separate tips differ from the low, spread-wing lake bird.
 b=[bone('body',[0,6,0],[c([-3,3,-2.6],[6,5.6,5.6],'owl_body'),c([-2.5,3.6,-3],[5,4.1,.7],'owl_belly'),c([-2.5,2.8,1.8],[5,1.2,2.2],'owl_tip')]),
    bone('head',[0,8,-1.8],[c([-2.7,7.2,-4.5],[5.4,4.4,3.8],'owl_head'),c([-2.4,7.5,-4.8],[4.8,3.6,.6],'owl_disc'),c([-.45,8.2,-5.4],[.9,1.1,.9],'owl_beak'),c([-2.5,11.1,-3.7],[1.1,1.5,1.1],'owl_ice'),c([1.4,11.1,-3.7],[1.1,1.5,1.1],'owl_ice')],'body'),
    bone('tail',[0,4.5,2.6],[c([-2,3.8,2.5],[4,1,2.8],'owl_tip'),c([-2.3,3.6,4.6],[4.6,.7,1.4],'owl_wing')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-4.1 if sign<0 else 2.8;tip=-4.3 if sign<0 else 3
  b.append(bone('wing_'+side,[sign*2.8,7,0],[c([x,3.5,-1.9],[1.3,4.3,4.4],'owl_wing'),c([x,3.1,1.5],[1.3,1.1,1.5],'owl_tip')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*3.4,4,0],[c([tip,2.5,-1.2],[1.3,1.5,3.7],'owl_tip')],'wing_'+side))
 for i,x in enumerate((-1.4,1.4)):
  b.append(bone(f'leg_{i}',[x,3.2,.7],[c([x-.45,.6,.2],[.9,2.6,.9],'owl_dark'),c([x-.7,0,-.5],[1.4,.8,1.9],'owl_beak')],'body'))
 return b

def lake_bird():
 b=[bone('body',[0,6,0],[c([-2.2,4.2,-3],[4.4,3.6,7.4],'lake_body'),c([-1.7,3.8,-2.2],[3.4,.7,5.8],'lake_feather')]),
    bone('neck',[0,7,-2.5],[c([-1.1,6.8,-4.1],[2.2,3,1.8],'lake_head')],'body'),
    bone('head',[0,9,-3.7],[c([-1.5,8.5,-5.6],[3,2.4,2.6],'lake_head'),c([-.45,8.8,-7.5],[.9,.7,2.2],'lake_beak'),c([-.5,10.4,-4.6],[1,1.6,1.3],'lake_feather')],'neck'),
    bone('tail',[0,5.5,4],[c([-1.6,5.1,3.8],[3.2,.6,3.4],'lake_wing'),c([-2.2,4.9,6.5],[4.4,.6,1.8],'lake_feather')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-6.1 if sign<0 else 2;tip=-9.6 if sign<0 else 5.8
  b.append(bone('wing_'+side,[sign*2,6.8,.1],[c([x,6.1,-2.5],[4.1,.9,5.1],'lake_wing'),c([x,5.8,2],[4.1,.5,1.3],'lake_feather')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*5.8,6.5,0],[c([tip,6,-1.9],[3.8,.8,4.6],'lake_feather'),c([tip,5.7,2.1],[3.5,.5,1.4],'lake_wing')],'wing_'+side))
 for i,x in enumerate((-1.1,1.1)):
  b.append(bone(f'leg_{i}',[x,4.2,.5],[c([x-.35,.5,.1],[.7,3.8,.8],'lake_dark'),c([x-.6,0,-.8],[1.2,.7,2],'lake_beak')],'body'))
 return b

def prison_ogre():
 b=[bone('body',[0,10,0],[c([-4.1,5.6,-2.5],[8.2,8.6,5],'prison_stone'),c([-4.4,11.5,-2.9],[8.8,1.8,5.8],'prison_ice'),c([-2.5,7.5,-2.9],[5,3.6,.6],'prison_dark')]),
    bone('cage',[0,9,-2.8],[c([-2.5,7.5,-3.2],[5,.6,.5],'prison_rim'),c([-2.5,10.5,-3.2],[5,.6,.5],'prison_rim'),c([-2,7.6,-3.2],[.6,3.4,.5],'prison_rim'),c([1.4,7.6,-3.2],[.6,3.4,.5],'prison_rim')],'body'),
    bone('head',[0,14,0],[c([-2.9,13.7,-2.5],[5.8,4.4,4.5],'prison_dark'),c([-3.1,17.7,-2.2],[6.2,.8,4],'prison_ice')],'body'),
    bone('crest',[0,18,-.5],[c([-.8,18.2,-1.5],[1.6,2.2,1.7],'prison_ice'),c([-.4,20,-1.2],[.8,1.2,1],'prison_rim')],'head')]
 for side,sign in [('l',-1),('r',1)]:
  x=-7 if sign<0 else 4
  b.append(bone('arm_'+side,[sign*4,13,0],[c([x,7,-2],[3,6.1,4],'prison_stone'),c([x-.2,11,-2.4],[3.4,2.2,4.8],'prison_ice')],'body'))
  b.append(bone('fist_'+side,[sign*5.5,7,0],[c([x,4.1,-2.1],[3,3.1,4.2],'prison_dark'),c([x-.2,4,-2.3],[3.4,1.1,4.6],'prison_rim')],'arm_'+side))
 for i,x in enumerate((-2.1,2.1)):
  b.append(bone(f'leg_{i}',[x,5.8,0],[c([x-1.3,.8,-1.4],[2.6,5.1,2.8],'prison_stone'),c([x-1.4,0,-1.8],[2.8,1.1,3.6],'prison_dark')],'body'))
 return b

def thin_ice_beetle():
 b=[bone('body',[0,3.7,0],[c([-3.2,2,-3],[6.4,3.2,7.8],'thin_body'),c([-3.5,4.9,-2.7],[7,1,7.1],'thin_shell')]),
    bone('head',[0,3.8,-2.8],[c([-2.4,2.5,-5.5],[4.8,2.6,3],'thin_body'),c([-.75,3.4,-7],[1.5,1,1.8],'thin_rim')],'body'),
    bone('shell_l',[-.1,5.5,0],[c([-3.5,5.4,-2.5],[3.5,1,6.7],'thin_shell'),c([-3,6.2,-2],[2.9,.6,4.8],'thin_rim')],'body'),
    bone('shell_r',[.1,5.5,0],[c([0,5.4,-2.5],[3.5,1,6.7],'thin_shell'),c([.1,6.2,-1.2],[2.6,.6,5.1],'thin_rim')],'body'),
    bone('shard',[0,6.4,1],[c([-.7,6.5,.1],[1.4,1.5,2.2],'thin_shell'),c([-.4,7.8,.5],[.8,1,1.4],'thin_rim')],'body')]
 for i in range(6):
  side=-1 if i%2==0 else 1;z=(-1.8,.2,2.4)[i//2];x=-5.3 if side<0 else 2.9;foot=-5.9 if side<0 else 4.7
  b.append(bone(f'leg_{i}',[side*3,3,z],[c([x,2.1,z-.45],[2.4,.9,.9],'thin_body')],'body'))
  b.append(bone(f'foot_{i}',[side*4.8,2.5,z],[c([foot,.3,z-.6],[1.2,2.3,1.2],'thin_claw'),c([foot-.1,0,z-.9],[1.4,.5,1.7],'thin_rim')],f'leg_{i}'))
 return b

def mirror_fox():
 b=[bone('body',[0,5.5,0],[c([-2.5,4,-3.2],[5,4.2,8],'mirror_fur'),c([-2.1,3.6,-2.2],[4.2,.7,5.5],'mirror_muzzle')]),
    bone('head',[0,6.5,-2.8],[c([-2,5.5,-6.1],[4,3.5,3.8],'mirror_head'),c([-1,5.5,-7.6],[2,1.3,1.8],'mirror_muzzle'),c([-1.8,8.6,-5.3],[1,1.7,1.1],'mirror_dark'),c([.8,8.6,-5.3],[1,1.7,1.1],'mirror_dark')],'body'),
    bone('ruff',[0,7,-2],[c([-2.7,6,-3],[5.4,2.2,2.6],'mirror_dark')],'body'),
    bone('tail',[0,6,4.5],[c([-1.3,4.8,4.3],[2.6,2.6,3.1],'mirror_fur')],'body'),
    bone('tail_mid',[0,6,7],[c([-1.9,4.4,6.9],[3.8,3.3,3.1],'mirror_glass')],'tail'),
    bone('tail_tip',[0,6,9.6],[c([-2.1,4.3,9.4],[4.2,3.5,2],'mirror_fur'),c([-1.8,4.5,11],[3.6,3.1,.9],'mirror_muzzle')],'tail_mid')]
 for i,(x,z) in enumerate([(-1.7,-1.8),(1.7,-1.8),(-1.7,3.2),(1.7,3.2)]):
  b.append(bone(f'leg_{i}',[x,4.2,z],[c([x-.6,.6,z-.6],[1.2,3.7,1.2],'mirror_fur'),c([x-.7,0,z-.9],[1.4,.8,1.7],'mirror_dark')],'body'))
 return b

def frost_pillar_bird():
 b=[bone('body',[0,6,0],[c([-2.2,3.8,-2.8],[4.4,4.4,6.2],'pillar_body'),c([-1.7,3.3,2],[3.4,1,2.7],'pillar_feather')]),
    bone('head',[0,7,-2.3],[c([-1.6,6,-5.2],[3.2,3.2,3.2],'pillar_head'),c([-.6,6.3,-6.7],[1.2,.9,1.8],'pillar_dark')],'body'),
    bone('pillar',[0,8,.8],[c([-1.1,7.9,0],[2.2,2.4,2.4],'pillar_ice'),c([-.7,10,0.4],[1.4,1.9,1.6],'pillar_feather')],'body'),
    bone('tail',[0,5,3.2],[c([-1.7,4.6,3],[3.4,.8,3.1],'pillar_wing'),c([-2.2,4.4,5.4],[4.4,.6,1.6],'pillar_feather')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-6 if sign<0 else 2.1;tip=-9.4 if sign<0 else 5.6
  b.append(bone('wing_'+side,[sign*2.1,6.5,0],[c([x,5.8,-2],[3.9,.9,4.8],'pillar_wing'),c([x,5.5,2.1],[3.9,.5,1.4],'pillar_feather')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*5.6,6.2,0],[c([tip,5.7,-1.4],[3.8,.8,4.5],'pillar_feather'),c([tip,5.4,2.5],[3.4,.5,1.1],'pillar_ice')],'wing_'+side))
 for i,x in enumerate((-1,1)):
  b.append(bone(f'leg_{i}',[x,3.8,.6],[c([x-.4,.4,.2],[.8,3.5,.8],'pillar_dark'),c([x-.6,0,-.6],[1.2,.6,1.8],'pillar_dark')],'body'))
 return b
def frost_spider():
 b=[bone('body',[0,4,0],[c([-3,2.7,-2],[6,3.2,5.3],'frost_spider'),c([-3.4,2.5,2],[6.8,3.8,5.5],'frost_spider'),c([-3,6,2.6],[6,.6,4.2],'frost_web')]),
    bone('head',[0,4,-2],[c([-2.4,2.7,-5],[4.8,2.8,3.3],'frost_spider_head'),c([-2,2,-5.4],[1,1.1,1.3],'frost_fang'),c([1,2,-5.4],[1,1.1,1.3],'frost_fang')],'body'),
    bone('spindle',[0,4,7],[c([-.9,3.3,7],[1.8,1.4,2.1],'frost_spider_leg'),c([-.5,3.5,8.7],[1,1,1.4],'frost_web')],'body'),
    bone('frost_crown',[0,6,4],[c([-1.6,6.5,3.2],[3.2,.7,2.7],'frost_fang'),c([-.6,7,3.8],[1.2,1.3,1.5],'frost_web')],'body')]
 for i in range(8):
  side=-1 if i%2==0 else 1;z=-1.3+(i//2)*2;x=-5.2 if side<0 else 2.8;tip=-5.7 if side<0 else 4.8
  b.append(bone(f'leg_{i}',[side*2.8,3.8,z],[c([x,3,z-.45],[2.4,1.1,.9],'frost_spider_leg')],'body'))
  b.append(bone(f'leg_tip_{i}',[side*4.9,3.3,z],[c([tip,.4,z-.5],[1,2.9,1],'frost_spider_leg'),c([tip-.1,0,z-.7],[1.2,.6,1.4],'frost_fang')],f'leg_{i}'))
 return b

def snow_hare():
 b=[bone('body',[0,4.4,0],[c([-2.8,2.5,-2.5],[5.6,4.3,6.9],'snow_hare'),c([-2.1,2.2,-1.7],[4.2,.6,5.1],'snow_hare_shadow')]),
    bone('head',[0,6,-2.5],[c([-2,5,-5.6],[4,3.5,3.5],'snow_hare'),c([-.9,5,-6.7],[1.8,1,1.4],'snow_hare_shadow')],'body'),
    bone('tail',[0,4.8,4],[c([-.8,4,3.9],[1.6,1.6,1.6],'snow_hare_shadow')],'body'),
    bone('snowdial',[0,6.7,1],[c([-1.5,6.5,-.5],[3,.7,3],'snow_hare_dark'),c([-1,7,-.1],[2,.5,2.2],'snow_hare_clock')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-1.8 if sign<0 else .6
  b.append(bone('ear_'+side,[sign*1.2,8,-4],[c([x,8,-4.8],[1.2,4.6,1.4],'snow_hare'),c([x+.2,8.5,-5],[.8,3.3,.3],'snow_hare_ear')],'head'))
 for i,(x,z) in enumerate([(-1.7,-1.3),(1.7,-1.3),(-1.9,2.9),(1.9,2.9)]):
  w=1.2 if i<2 else 1.8
  b.append(bone(f'leg_{i}',[x,3,z],[c([x-w/2,.6,z-.6],[w,2.5,1.2],'snow_hare'),c([x-w/2,0,z-1.2],[w,.8,1.9],'snow_hare_dark')],'body'))
 return b

def white_horn():
 b=[bone('body',[0,10,0],[c([-3.8,5.5,-2.5],[7.6,8.4,5],'white_body'),c([-4,11,-3],[8,2,5.8],'white_plate'),c([-1.4,7.7,-2.9],[2.8,2.4,.6],'white_rune')]),
    bone('head',[0,14,0],[c([-2.6,13.4,-2.4],[5.2,4.2,4.4],'white_dark'),c([-2.8,17.2,-2.1],[5.6,.8,4],'white_plate')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-6.7 if sign<0 else 3.9;hx=-3 if sign<0 else 1.8
  b.append(bone('horn_'+side,[sign*2,17,-.7],[c([hx,16.9,-1.7],[1.2,3.4,1.5],'white_horn'),c([-3.8 if sign<0 else 1.8,19.4,-1.7],[2,.9,1.5],'white_horn'),c([-3.8 if sign<0 else 3,19.4,-1.7],[.8,1.5,1.5],'white_horn')],'head'))
  b.append(bone('arm_'+side,[sign*3.9,12.6,0],[c([x,7,-2],[2.8,5.8,4],'white_body'),c([x-.15,10.7,-2.4],[3.1,2,4.8],'white_plate')],'body'))
  b.append(bone('forearm_'+side,[sign*5.3,7,0],[c([x,4.2,-2],[2.8,3,4],'white_dark'),c([x-.15,4,-2.2],[3.1,1,4.4],'white_plate')],'arm_'+side))
 for i,x in enumerate((-2,2)):
  b.append(bone(f'leg_{i}',[x,5.7,0],[c([x-1.25,.8,-1.4],[2.5,5,2.8],'white_body'),c([x-1.4,0,-1.8],[2.8,1.1,3.6],'white_dark')],'body'))
 return b

def frost_bird():
 # Upright, short-winged frost bird; not a reskin of the spread-wing birds.
 b=[bone('body',[0,5.5,0],[c([-2.7,2.5,-2.3],[5.4,6,5.5],'frostbird_body'),c([-2.3,3,-2.7],[4.6,4.5,.7],'frostbird_belly')]),
    bone('head',[0,8,-1.6],[c([-2.2,7.8,-4],[4.4,3.4,3.5],'frostbird_head'),c([-.6,8.2,-5.6],[1.2,.9,1.9],'frostbird_beak'),c([-2,10.8,-3.6],[4,.7,2.8],'frostbird_tip')],'body'),
    bone('tail',[0,4,2.8],[c([-1.5,3.4,2.7],[3,1.1,2.5],'frostbird_tip')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-4 if sign<0 else 2.6;tip=-4.1 if sign<0 else 2.8
  b.append(bone('wing_'+side,[sign*2.6,7,0],[c([x,3.7,-1.6],[1.4,3.7,4],'frostbird_wing')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*3.3,4.5,0],[c([tip,2.8,-1],[1.3,1.4,3.4],'frostbird_tip')],'wing_'+side))
 for i,x in enumerate((-1.2,1.2)):
  b.append(bone(f'leg_{i}',[x,2.6,.4],[c([x-.4,.5,0],[.8,2.2,.8],'frostbird_dark'),c([x-.65,0,-.7],[1.3,.7,1.8],'frostbird_beak')],'body'))
 return b

def avalanche_beast():
 b=[bone('body',[0,7,0],[c([-3,5,-3.7],[6,5,9],'avalanche_fur'),c([-3.3,6.5,-3.5],[6.6,4,3.5],'avalanche_mane')]),
    bone('head',[0,8,-3],[c([-2.2,7,-6.9],[4.4,3.5,4.2],'avalanche_head'),c([-1.3,7,-9.2],[2.6,1.7,2.7],'avalanche_dark'),c([-2,10.1,-5.8],[1.1,1.8,1.3],'avalanche_mane'),c([.9,10.1,-5.8],[1.1,1.8,1.3],'avalanche_mane')],'body'),
    bone('ridge',[0,10,-1],[c([-2,9.8,-1.8],[4,1,4.3],'avalanche_mane'),c([-.7,10.6,-.4],[1.4,1.2,2],'avalanche_claw')],'body'),
    bone('tail',[0,8,5],[c([-1,7,4.9],[2,2,3],'avalanche_fur')],'body'),
    bone('tail_tip',[0,8,7.5],[c([-1.4,6.7,7.4],[2.8,2.6,2.7],'avalanche_mane')],'tail')]
 for i,(x,z) in enumerate([(-2,-2.2),(2,-2.2),(-2,4),(2,4)]):
  b.append(bone(f'leg_{i}',[x,5.6,z],[c([x-.75,2.3,z-.7],[1.5,3.5,1.4],'avalanche_fur')],'body'))
  b.append(bone(f'paw_{i}',[x,2.4,z],[c([x-.7,.5,z-.7],[1.4,2,1.4],'avalanche_dark'),c([x-.95,0,z-1.2],[1.9,.7,2],'avalanche_claw')],f'leg_{i}'))
 return b

def crystal_beetle():
 b=[bone('body',[0,4,0],[c([-3.5,2,-3],[7,3.6,8.2],'crystal_body'),c([-3.8,5.2,-2.8],[7.6,1.2,7.7],'crystal_shell')]),
    bone('head',[0,4,-2.8],[c([-2.5,2.6,-5.7],[5,2.8,3.1],'crystal_body'),c([-.8,3.2,-7.1],[1.6,1.2,1.7],'crystal_core')],'body'),
    bone('shell_l',[-.1,6,0],[c([-3.8,6,-2.5],[3.8,1,7],'crystal_shell'),c([-3.3,6.8,-1.9],[3.2,.7,5.5],'crystal_plate')],'body'),
    bone('shell_r',[.1,6,0],[c([0,6,-2.5],[3.8,1,7],'crystal_shell'),c([.1,6.8,-1.9],[3.2,.7,5.5],'crystal_plate')],'body'),
    bone('core',[0,7,1],[c([-1.2,7.3,-.4],[2.4,2.3,2.8],'crystal_core'),c([-.6,9.3,.1],[1.2,1.6,1.8],'crystal_plate')],'body')]
 for i in range(6):
  side=-1 if i%2==0 else 1;z=(-1.8,.3,2.5)[i//2];x=-5.7 if side<0 else 3.2;foot=-6.2 if side<0 else 4.9
  b.append(bone(f'leg_{i}',[side*3.2,3.4,z],[c([x,2.3,z-.45],[2.5,1,.9],'crystal_body')],'body'))
  b.append(bone(f'foot_{i}',[side*5,2.7,z],[c([foot,.4,z-.6],[1.3,2.4,1.2],'crystal_dark'),c([foot-.15,0,z-.9],[1.6,.6,1.8],'crystal_plate')],f'leg_{i}'))
 return b
DESIGNS=[ice_owl,lake_bird,prison_ogre,thin_ice_beetle,mirror_fox,frost_pillar_bird,frost_spider,snow_hare,white_horn,frost_bird,avalanche_beast,crystal_beetle]

def paint(mat,w,h,seed,face,part,ci):
 no_eye=mat in ('owl_head','owl_disc','lake_head','prison_dark','thin_body','mirror_head','pillar_head','frost_spider_head','snow_hare','white_dark','frostbird_head','avalanche_head','crystal_body')
 im=surface(mat,w,h,seed,face,'no_generic_eye' if no_eye else part,ci);d=ImageDraw.Draw(im);base=PALETTE[mat]
 if mat in ('owl_body','owl_belly','owl_wing','owl_tip','lake_feather','lake_wing','pillar_wing','pillar_feather','frostbird_wing','frostbird_belly'):
  for row in range(3):
   for col in range(4):
    x=w*(.1+col*.21+(row%2)*.08);y=h*(.12+row*.26)
    d.arc((x,y,x+w*.15,y+h*.2),15,165,fill=(*tint(base,-23),255),width=max(1,w//85))
 if mat in ('owl_ice','prison_ice','thin_rim','thin_shell','mirror_glass','pillar_ice','crystal_shell','crystal_plate','crystal_core'):
  d.line([(w*.14,h*.8),(w*.48,h*.15),(w*.86,h*.8)],fill=(*tint(base,23),255),width=max(1,w//70))
  d.line((w*.48,h*.15,w*.51,h*.9),fill=(*tint(base,-22),255),width=max(1,w//95))
 if mat=='owl_disc' and face=='north':
  for x in (.27,.73):
   rx=w*.18;ry=h*.27;cx=w*x;cy=h*.38
   d.ellipse((cx-rx,cy-ry,cx+rx,cy+ry),fill=(114,147,156,255))
   d.ellipse((cx-rx*.65,cy-ry*.7,cx+rx*.65,cy+ry*.7),fill=(224,238,218,255))
   d.ellipse((cx-rx*.3,cy-ry*.45,cx+rx*.3,cy+ry*.45),fill=(38,67,80,255))
   d.line((cx-rx,cy-ry*.7,cx+rx,cy-ry*.5),fill=(77,111,121,255),width=max(1,w//45))
 if mat in ('lake_head','mirror_head','pillar_head','thin_body','frost_spider_head','snow_hare','frostbird_head','avalanche_head','crystal_body') and part=='head' and ci==0 and face in ('west','east'):
  d.polygon([(w*.22,h*.3),(w*.64,h*.35),(w*.58,h*.48),(w*.3,h*.46)],fill=(43,73,85,255))
  d.polygon([(w*.3,h*.35),(w*.58,h*.38),(w*.53,h*.44),(w*.33,h*.43)],fill=(205,240,232,255))
 if mat in ('prison_dark','white_dark') and part=='head' and ci==0 and face=='north':
  for x in (.3,.7):d.polygon([(w*(x-.1),h*.33),(w*(x+.1),h*.38),(w*(x+.08),h*.48),(w*(x-.08),h*.44)],fill=(196,236,234,255))
 if mat=='frost_web' and face in ('up','west','east'):
  d.line([(w*.12,h*.2),(w*.88,h*.8)],fill=(130,175,184,255),width=max(1,w//70));d.line([(w*.88,h*.2),(w*.12,h*.8)],fill=(130,175,184,255),width=max(1,w//70))
 if mat=='snow_hare_clock' and face=='up':
  d.line([(w*.25,h*.22),(w*.75,h*.22),(w*.28,h*.8),(w*.75,h*.8),(w*.25,h*.22)],fill=(73,120,134,255),width=max(1,w//20))
 if mat=='mirror_glass' and face in ('west','east','up'):
  d.line([(w*.16,h*.25),(w*.4,h*.7),(w*.63,h*.25),(w*.83,h*.55)],fill=(226,246,239,255),width=max(1,w//45))
 return im

def build(i):return bake(f'foe_3_{i}',f'f3_{i}_',DESIGNS[i](),paint)
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 for i in range(len(DESIGNS)):
  for path,data in build(i).items():
   if a.write:path.write_bytes(data)
   elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Ice foe art stale: '+str(path))
 print(f'{len(DESIGNS)} ice foe prototypes: {len(DESIGNS)*4} files '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
