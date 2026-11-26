#!/usr/bin/env python3
"""Twelve individually designed storm-cliff enemy appearance prototypes.

Each geometry is authored explicitly. Procedural color, MER and approximate
normal maps are studies, not finished paintings. Gameplay stays untouched.
"""
import argparse
from PIL import ImageDraw
from build_forest_wild_art import c,bone,bake,PALETTE,surface,tint
PALETTE.update({
 'giant_rock':(70,78,90),'giant_plate':(112,120,130),'giant_dark':(48,56,67),'giant_rune':(222,184,87),'giant_edge':(151,155,152),
 'copper_body':(78,85,90),'copper_head':(104,99,88),'copper_wing':(155,99,67),'copper_feather':(199,137,85),'copper_light':(226,183,108),'copper_dark':(51,61,69),
 'crusher_rock':(91,88,85),'crusher_dark':(55,58,63),'crusher_plate':(132,124,110),'crusher_rune':(220,169,77),'crusher_horn':(177,164,137),
 'iron_body':(67,75,80),'iron_plate':(101,112,115),'iron_shell':(123,129,124),'iron_edge':(181,164,123),'iron_dark':(47,54,61),
 'shadow_fur':(53,60,70),'shadow_head':(72,79,86),'shadow_mane':(96,100,102),'shadow_dark':(37,45,55),'shadow_rune':(220,183,89),
 'conductor_body':(74,83,83),'conductor_head':(111,111,96),'conductor_wing':(153,99,72),'conductor_tip':(197,146,103),'conductor_coil':(220,182,103),'conductor_dark':(47,57,60),
 'thread_body':(67,75,85),'thread_head':(93,101,108),'thread_joint':(52,60,72),'thread_gold':(208,180,105),'thread_web':(181,196,186),
 'rain_fur':(143,148,145),'rain_dark':(78,91,101),'rain_ear':(174,158,145),'rain_belly':(208,205,186),'rain_mark':(226,190,111),
 'horn_rock':(79,83,87),'horn_dark':(50,57,65),'horn_plate':(128,132,127),'horn_metal':(183,177,149),'horn_rune':(230,190,93),
 'arc_body':(68,79,87),'arc_head':(107,112,109),'arc_wing':(127,106,86),'arc_tip':(206,161,100),'arc_beak':(225,195,130),'arc_dark':(44,55,65),
 'wall_stone':(75,84,88),'wall_dark':(45,54,59),'wall_iron':(116,126,120),'wall_rim':(178,171,142),'wall_rune':(214,181,94),
 'glide_fur':(83,87,92),'glide_head':(112,113,105),'glide_dark':(51,59,67),'glide_membrane':(151,133,113),'glide_needle':(226,191,111),
})

def rock_giant():
 b=[bone('body',[0,11,0],[c([-4.8,6,-2.8],[9.6,9,5.6],'giant_rock'),c([-4.2,12,-3.2],[8.4,2.2,.8],'giant_plate'),c([-1.4,8,-3.1],[2.8,2.6,.7],'giant_rune')]),
    bone('head',[0,15,0],[c([-3.1,14.5,-2.8],[6.2,4.5,5],'giant_dark'),c([-3.4,18.5,-2.5],[6.8,1,4.6],'giant_plate')],'body'),
    bone('back_pylon',[0,14,1],[c([-1,14.4,.8],[2,3.8,1.8],'giant_plate'),c([-.6,17.8,1],[1.2,2,1.4],'giant_rune')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-8 if sign<0 else 4.7
  b.append(bone('arm_'+side,[sign*4.7,13.7,0],[c([x,7,-2.2],[3.3,6.8,4.4],'giant_rock'),c([x-.15,11.6,-2.5],[3.6,2.4,5],'giant_plate')],'body'))
  b.append(bone('fist_'+side,[sign*6.2,7,0],[c([x,4.1,-2.3],[3.3,3.2,4.6],'giant_dark'),c([x-.2,4,-2.5],[3.7,1.2,5],'giant_edge')],'arm_'+side))
 for i,x in enumerate((-2.3,2.3)):
  b.append(bone(f'leg_{i}',[x,6.2,0],[c([x-1.5,.8,-1.5],[3,5.6,3],'giant_rock'),c([x-1.6,0,-1.9],[3.2,1.2,3.8],'giant_dark')],'body'))
 return b

def copper_bird():
 b=[bone('body',[0,6,0],[c([-2.3,3.8,-2.8],[4.6,4.7,6.6],'copper_body'),c([-1.8,3.5,-2.2],[3.6,.7,5.3],'copper_feather')]),
    bone('head',[0,7,-2.4],[c([-1.8,6,-5.4],[3.6,3.3,3.4],'copper_head'),c([-.6,6.3,-7.1],[1.2,1,2],'copper_light'),c([-.6,9,-4.5],[1.2,1.8,1.5],'copper_feather')],'body'),
    bone('tail',[0,5.2,3.5],[c([-1.7,4.8,3.3],[3.4,.8,3.3],'copper_wing'),c([-2.3,4.6,5.8],[4.6,.6,1.8],'copper_feather')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-6.1 if sign<0 else 2.1;tip=-9.8 if sign<0 else 5.7
  b.append(bone('wing_'+side,[sign*2.1,6.5,0],[c([x,5.8,-2.2],[4,1,5.1],'copper_wing'),c([x,5.5,2.2],[4,.5,1.4],'copper_feather')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*5.7,6.2,0],[c([tip,5.7,-1.6],[4.1,.8,4.7],'copper_feather'),c([tip,5.4,2.5],[3.7,.5,1.3],'copper_light')],'wing_'+side))
 for i,x in enumerate((-1.1,1.1)):
  b.append(bone(f'leg_{i}',[x,3.8,.6],[c([x-.4,.4,.2],[.8,3.5,.8],'copper_dark'),c([x-.6,0,-.6],[1.2,.6,1.8],'copper_light')],'body'))
 return b

def rock_crusher():
 # Low-set bulk with oversized split fists and an off-center fractured crest.
 b=[bone('body',[0,9,0],[c([-4.7,5,-2.8],[9.4,8.5,5.6],'crusher_rock'),c([-4.3,11,-3.2],[8.6,2,.7],'crusher_plate'),c([-1.3,7.2,-3],[2.6,2.4,.6],'crusher_rune')]),
    bone('head',[0,13.5,0],[c([-3,13,-2.5],[6,4.4,4.5],'crusher_dark'),c([-2.8,17,-2.3],[5.6,.9,4.1],'crusher_plate'),c([-.8,17.7,-1.8],[1.6,2,1.8],'crusher_horn')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-8.1 if sign<0 else 4.6
  b.append(bone('arm_'+side,[sign*4.6,12,0],[c([x,7,-2],[3.5,5.2,4],'crusher_rock'),c([x-.15,10.5,-2.4],[3.8,1.9,4.8],'crusher_plate')],'body'))
  b.append(bone('fist_'+side,[sign*6.2,7,0],[c([x-.3,3.6,-2.5],[4.1,3.8,5],'crusher_dark'),c([x-.4,3.5,-2.6],[4.3,1.2,5.2],'crusher_horn')],'arm_'+side))
 for i,x in enumerate((-2.2,2.2)):
  b.append(bone(f'leg_{i}',[x,5.4,0],[c([x-1.4,.8,-1.5],[2.8,4.8,3],'crusher_rock'),c([x-1.5,0,-1.9],[3,1,3.7],'crusher_dark')],'body'))
 return b

def iron_beetle():
 b=[bone('body',[0,4,0],[c([-3.4,2,-3],[6.8,3.6,8],'iron_body'),c([-3.7,5.2,-2.8],[7.4,1.1,7.4],'iron_shell')]),
    bone('head',[0,4,-3],[c([-2.4,2.7,-5.6],[4.8,2.8,3],'iron_dark'),c([-.8,3.3,-7.2],[1.6,1.2,1.9],'iron_edge')],'body'),
    bone('shell_l',[-.1,6,0],[c([-3.7,6,-2.5],[3.7,1,6.9],'iron_plate'),c([-3.2,6.8,-1.9],[3,.7,5.4],'iron_shell')],'body'),
    bone('shell_r',[.1,6,0],[c([0,6,-2.5],[3.7,1,6.9],'iron_plate'),c([.2,6.8,-1.9],[3,.7,5.4],'iron_shell')],'body'),
    bone('magnet',[0,7,1],[c([-2,7.3,0],[4,.8,2.8],'iron_dark'),c([-2,8,0],[1,1.3,1],'iron_edge'),c([1,8,0],[1,1.3,1],'iron_edge')],'body')]
 for i in range(6):
  side=-1 if i%2==0 else 1;z=(-1.8,.3,2.5)[i//2];x=-5.6 if side<0 else 3.1;foot=-6.1 if side<0 else 4.9
  b.append(bone(f'leg_{i}',[side*3.1,3.3,z],[c([x,2.3,z-.45],[2.5,1,.9],'iron_body')],'body'))
  b.append(bone(f'foot_{i}',[side*5,2.7,z],[c([foot,.4,z-.6],[1.2,2.4,1.2],'iron_dark'),c([foot-.15,0,z-.9],[1.5,.6,1.8],'iron_edge')],f'leg_{i}'))
 return b

def lightning_hunter():
 b=[bone('body',[0,7,0],[c([-2.6,5,-3.4],[5.2,4.6,8.8],'shadow_fur'),c([-2.9,7,-3.4],[5.8,3.1,3.3],'shadow_mane')]),
    bone('head',[0,8,-3],[c([-2,7,-6.6],[4,3.4,4],'shadow_head'),c([-1,7,-8.7],[2,1.4,2.5],'shadow_dark'),c([-1.8,10,-5.7],[1,1.8,1.2],'shadow_mane'),c([.8,10,-5.7],[1,1.8,1.2],'shadow_mane')],'body'),
    bone('ridge',[0,9.5,-1],[c([-1.8,9.4,-1.5],[3.6,.8,4],'shadow_mane'),c([-.6,10,-.3],[1.2,1.4,1.6],'shadow_rune')],'body'),
    bone('tail',[0,7.5,5],[c([-.9,6.5,4.8],[1.8,1.8,3.2],'shadow_fur')],'body'),
    bone('tail_tip',[0,7.5,7.6],[c([-1.4,6,7.5],[2.8,2.7,2.8],'shadow_mane'),c([-1.1,6.2,9.7],[2.2,2.3,1],'shadow_rune')],'tail')]
 for i,(x,z) in enumerate([(-1.8,-2.2),(1.8,-2.2),(-1.8,4),(1.8,4)]):
  b.append(bone(f'leg_{i}',[x,5.3,z],[c([x-.65,2.1,z-.6],[1.3,3.3,1.2],'shadow_fur')],'body'))
  b.append(bone(f'paw_{i}',[x,2.2,z],[c([x-.55,.5,z-.5],[1.1,1.8,1],'shadow_dark'),c([x-.75,0,z-.9],[1.5,.7,1.7],'shadow_dark')],f'leg_{i}'))
 return b

def conductor_bird():
 b=[bone('body',[0,6,0],[c([-2.5,3.6,-2.6],[5,4.8,6.4],'conductor_body'),c([-2,3.2,2],[4,1,2.8],'conductor_tip')]),
    bone('head',[0,7,-2.3],[c([-1.7,6,-5.2],[3.4,3.2,3.3],'conductor_head'),c([-.6,6.2,-6.8],[1.2,.9,1.9],'conductor_coil')],'body'),
    bone('coil',[0,8,.6],[c([-1.5,8,-.7],[3,1.1,2.8],'conductor_dark'),c([-1,9,-.2],[2,.9,1.8],'conductor_coil')],'body'),
    bone('tail',[0,5,3.4],[c([-1.8,4.7,3.2],[3.6,.8,3.3],'conductor_wing'),c([-2.4,4.4,5.8],[4.8,.6,1.8],'conductor_tip')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-6.3 if sign<0 else 2.3;tip=-9.6 if sign<0 else 5.8
  b.append(bone('wing_'+side,[sign*2.3,6.5,0],[c([x,5.8,-2],[4,1,5],'conductor_wing'),c([x,5.5,2.3],[4,.5,1.3],'conductor_coil')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*5.8,6.2,0],[c([tip,5.7,-1.5],[3.8,.8,4.6],'conductor_tip'),c([tip,5.4,2.5],[3.5,.5,1.2],'conductor_coil')],'wing_'+side))
 for i,x in enumerate((-1.1,1.1)):
  b.append(bone(f'leg_{i}',[x,3.8,.6],[c([x-.4,.4,.2],[.8,3.5,.8],'conductor_dark'),c([x-.6,0,-.6],[1.2,.6,1.8],'conductor_dark')],'body'))
 return b

def thread_spider():
 b=[bone('body',[0,4,0],[c([-3,2.7,-2],[6,3.2,5.3],'thread_body'),c([-3.5,2.4,2],[7,3.9,5.5],'thread_body'),c([-3.1,6,2.6],[6.2,.6,4.2],'thread_web')]),
    bone('head',[0,4,-2],[c([-2.4,2.7,-5],[4.8,2.7,3.3],'thread_head'),c([-2,2,-5.4],[1,1,1.3],'thread_joint'),c([1,2,-5.4],[1,1,1.3],'thread_joint')],'body'),
    bone('coil',[0,6,4],[c([-1.7,6.4,3],[3.4,.8,3],'thread_joint'),c([-.8,7,3.7],[1.6,1.1,1.5],'thread_gold')],'body'),
    bone('spinner',[0,4,7],[c([-.9,3.3,7],[1.8,1.4,2.1],'thread_joint'),c([-.5,3.5,8.7],[1,1,1.4],'thread_gold')],'body')]
 for i in range(8):
  side=-1 if i%2==0 else 1;z=-1.3+(i//2)*2;x=-5.2 if side<0 else 2.8;tip=-5.7 if side<0 else 4.8
  b.append(bone(f'leg_{i}',[side*2.8,3.8,z],[c([x,3,z-.45],[2.4,1.1,.9],'thread_joint')],'body'))
  b.append(bone(f'leg_tip_{i}',[side*4.9,3.3,z],[c([tip,.4,z-.5],[1,2.9,1],'thread_joint'),c([tip-.1,0,z-.7],[1.2,.6,1.4],'thread_gold')],f'leg_{i}'))
 return b

def rain_rabbit():
 b=[bone('body',[0,4.4,0],[c([-2.8,2.5,-2.5],[5.6,4.3,6.9],'rain_fur'),c([-2.1,2.2,-1.7],[4.2,.6,5.1],'rain_belly')]),
    bone('head',[0,6,-2.5],[c([-2,5,-5.6],[4,3.5,3.5],'rain_fur'),c([-.9,5,-6.7],[1.8,1,1.4],'rain_belly')],'body'),
    bone('tail',[0,4.8,4],[c([-.8,4,3.9],[1.6,1.6,1.6],'rain_belly')],'body'),
    bone('rain_mark',[0,6.7,1],[c([-1.4,6.6,-.5],[2.8,.6,3],'rain_dark'),c([-1,7.1,0],[2,.5,2],'rain_mark')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-1.8 if sign<0 else .6
  b.append(bone('ear_'+side,[sign*1.2,8,-4],[c([x,8,-4.8],[1.2,4.6,1.4],'rain_fur'),c([x+.2,8.5,-5],[.8,3.3,.3],'rain_ear')],'head'))
 for i,(x,z) in enumerate([(-1.7,-1.3),(1.7,-1.3),(-1.9,2.9),(1.9,2.9)]):
  w=1.2 if i<2 else 1.8
  b.append(bone(f'leg_{i}',[x,3,z],[c([x-w/2,.6,z-.6],[w,2.5,1.2],'rain_fur'),c([x-w/2,0,z-1.2],[w,.8,1.9],'rain_dark')],'body'))
 return b

def steel_horn():
 b=[bone('body',[0,10,0],[c([-4,5.5,-2.6],[8,8.5,5.2],'horn_rock'),c([-4.3,11,-3],[8.6,2,6],'horn_plate'),c([-1.4,7.7,-3],[2.8,2.4,.7],'horn_rune')]),
    bone('head',[0,14,0],[c([-2.8,13.5,-2.5],[5.6,4.3,4.6],'horn_dark'),c([-3,17.4,-2.2],[6,.8,4.1],'horn_plate')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-7 if sign<0 else 4;hx=-3.2 if sign<0 else 2
  b.append(bone('horn_'+side,[sign*2.2,17,-.7],[c([hx,17,-1.8],[1.2,3,1.5],'horn_metal'),c([-4 if sign<0 else 2,19.3,-1.8],[2,.9,1.5],'horn_metal'),c([-4 if sign<0 else 3.2,19.3,-1.8],[.8,1.5,1.5],'horn_metal')],'head'))
  b.append(bone('arm_'+side,[sign*4,12.6,0],[c([x,7,-2],[3,5.8,4],'horn_rock'),c([x-.15,10.7,-2.4],[3.3,2,4.8],'horn_plate')],'body'))
  b.append(bone('forearm_'+side,[sign*5.4,7,0],[c([x,4.2,-2.1],[3,3,4.2],'horn_dark'),c([x-.15,4,-2.3],[3.3,1,4.6],'horn_metal')],'arm_'+side))
 for i,x in enumerate((-2.1,2.1)):
  b.append(bone(f'leg_{i}',[x,5.7,0],[c([x-1.3,.8,-1.4],[2.6,5,2.8],'horn_rock'),c([x-1.4,0,-1.8],[2.8,1.1,3.6],'horn_dark')],'body'))
 return b

def arc_bird():
 # Upright bird with folded wings, a split lightning crest and tail fan.
 b=[bone('body',[0,5.5,0],[c([-2.5,2.7,-2.3],[5,5.8,5.6],'arc_body'),c([-2.1,3,-2.7],[4.2,4.2,.7],'arc_tip')]),
    bone('head',[0,8,-1.6],[c([-2.1,7.8,-4.1],[4.2,3.4,3.6],'arc_head'),c([-.6,8.2,-5.7],[1.2,.9,1.9],'arc_beak'),c([-1.7,10.8,-3.5],[1.1,1.6,1.1],'arc_tip'),c([.6,10.8,-3.5],[1.1,2.1,1.1],'arc_tip')],'body'),
    bone('tail',[0,4,3],[c([-2,3.7,2.8],[4,.8,2.8],'arc_wing'),c([-2.4,3.5,5],[4.8,.6,1.5],'arc_tip')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-3.9 if sign<0 else 2.4;tip=-4 if sign<0 else 2.6
  b.append(bone('wing_'+side,[sign*2.4,7,0],[c([x,3.7,-1.6],[1.5,3.7,4],'arc_wing')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*3.2,4.5,0],[c([tip,2.8,-1],[1.4,1.4,3.4],'arc_tip')],'wing_'+side))
 for i,x in enumerate((-1.2,1.2)):
  b.append(bone(f'leg_{i}',[x,2.8,.4],[c([x-.4,.5,0],[.8,2.4,.8],'arc_dark'),c([x-.65,0,-.7],[1.3,.7,1.8],'arc_beak')],'body'))
 return b

def wall_soldier():
 # Previous six-legged beetle silhouette changed to a blocky wall soldier;
 # behavior and collision remain unchanged pending gameplay-aware review.
 b=[bone('body',[0,10,0],[c([-4.5,5.5,-2.7],[9,8.8,5.4],'wall_stone'),c([-4.8,11.5,-3.1],[9.6,2.2,6.2],'wall_iron'),c([-3.4,7,-3.1],[6.8,3.5,.7],'wall_dark')]),
    bone('shield',[0,9,-3],[c([-3.2,6.8,-3.7],[6.4,4,.8],'wall_iron'),c([-2.5,7.4,-4],[5,2.8,.5],'wall_dark'),c([-.7,8,-4.3],[1.4,1.6,.5],'wall_rune')],'body'),
    bone('head',[0,14.5,0],[c([-3,14,-2.5],[6,4.3,4.6],'wall_dark'),c([-3.3,17.9,-2.3],[6.6,1,4.2],'wall_iron')],'body'),
    bone('battlement',[0,18,0],[c([-3,18.6,-1.8],[1,1.4,1.3],'wall_rim'),c([-.5,18.6,-1.8],[1,1.4,1.3],'wall_rim'),c([2,18.6,-1.8],[1,1.4,1.3],'wall_rim'),c([-3,18.4,-1.8],[6,.4,1.3],'wall_iron')],'head')]
 for side,sign in [('l',-1),('r',1)]:
  x=-7.5 if sign<0 else 4.4
  b.append(bone('arm_'+side,[sign*4.4,13,0],[c([x,7,-2],[3.1,6.2,4],'wall_stone'),c([x-.1,11,-2.4],[3.3,2.2,4.8],'wall_iron')],'body'))
  b.append(bone('forearm_'+side,[sign*5.8,7,0],[c([x,4,-2.1],[3.1,3.2,4.2],'wall_dark'),c([x-.15,3.9,-2.3],[3.4,1.1,4.6],'wall_rim')],'arm_'+side))
 for i,x in enumerate((-2.2,2.2)):
  b.append(bone(f'leg_{i}',[x,5.8,0],[c([x-1.4,.8,-1.5],[2.8,5.1,3],'wall_stone'),c([x-1.5,0,-1.9],[3,1.1,3.8],'wall_dark')],'body'))
 return b

def gliding_beast():
 # Four-legged body retains all four stride joints; membrane wings are added.
 b=[bone('body',[0,6,0],[c([-2.3,4.2,-3],[4.6,3.9,7.8],'glide_fur'),c([-2.5,7,-2.8],[5,1.3,3],'glide_head')]),
    bone('head',[0,7,-2.7],[c([-1.8,6,-6],[3.6,3.1,3.6],'glide_head'),c([-.9,6,-7.6],[1.8,1.1,2],'glide_dark'),c([-1.7,8.8,-5.3],[.9,1.9,1],'glide_dark'),c([.8,8.8,-5.3],[.9,1.9,1],'glide_dark')],'body'),
    bone('needle',[0,8,0],[c([-.6,7.9,-1],[1.2,2.2,1.6],'glide_needle'),c([-.35,9.9,-.8],[.7,1.2,1.1],'glide_dark')],'body'),
    bone('tail',[0,6,4.6],[c([-.7,5.3,4.4],[1.4,1.4,3],'glide_fur')],'body'),
    bone('tail_tip',[0,6,7],[c([-1,5,6.9],[2,2,2.8],'glide_membrane'),c([-.7,5.3,9.3],[1.4,1.4,.8],'glide_needle')],'tail')]
 for i,(x,z) in enumerate([(-1.6,-1.8),(1.6,-1.8),(-1.6,3.5),(1.6,3.5)]):
  b.append(bone(f'leg_{i}',[x,4.4,z],[c([x-.5,.5,z-.5],[1,4,1],'glide_fur'),c([x-.7,0,z-.9],[1.4,.7,1.7],'glide_dark')],'body'))
 for side,sign in [('l',-1),('r',1)]:
  x=-6 if sign<0 else 2.2;tip=-9 if sign<0 else 5.6
  b.append(bone('wing_'+side,[sign*2.2,7,0],[c([x,6.7,-1.6],[3.8,.6,5],'glide_membrane'),c([x,6.5,-1.8],[3.8,.6,.7],'glide_dark')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*5.6,7,0],[c([tip,6.6,-1],[3.4,.5,4.5],'glide_membrane'),c([tip,6.4,-1.1],[3.4,.5,.7],'glide_needle')],'wing_'+side))
 return b
DESIGNS=[rock_giant,copper_bird,rock_crusher,iron_beetle,lightning_hunter,conductor_bird,thread_spider,rain_rabbit,steel_horn,arc_bird,wall_soldier,gliding_beast]
METAL={'copper_wing','copper_feather','conductor_wing','conductor_tip','conductor_coil','iron_plate','iron_shell','horn_metal','wall_iron','wall_rim'}

def paint(mat,w,h,seed,face,part,ci):
 no_eye=mat in ('giant_dark','copper_head','crusher_dark','iron_dark','shadow_head','conductor_head','thread_head','rain_fur','horn_dark','arc_head','wall_dark','glide_head')
 im=surface(mat,w,h,seed,face,'no_generic_eye' if no_eye else part,ci);d=ImageDraw.Draw(im);base=PALETTE[mat]
 if mat in ('giant_rock','crusher_rock','horn_rock','wall_stone'):
  for k in range(1,4):
   x=w*k/4;d.line([(x,0),(x-w*.04,h*.28),(x+w*.04,h*.55),(x,h)],fill=(*tint(base,-23),255),width=max(1,w//75))
 if mat in ('copper_wing','copper_feather','conductor_wing','conductor_tip','arc_wing','arc_tip','glide_membrane'):
  for k in range(1,5):
   x=w*k/5;d.line([(x,0),(x-w*.06,h*.5),(x,h)],fill=(*tint(base,-24),255),width=max(1,w//70))
 if mat in ('iron_plate','iron_shell','wall_iron','wall_rim'):
  for y in (.2,.8):
   for x in (.15,.5,.85):
    r=max(1,min(w,h)//35);d.ellipse((w*x-r,h*y-r,w*x+r,h*y+r),fill=(*tint(base,27),255))
 if mat in ('giant_rune','crusher_rune','horn_rune','wall_rune','shadow_rune','rain_mark'):
  d.line([(w*.62,h*.12),(w*.36,h*.47),(w*.62,h*.47),(w*.38,h*.88)],fill=(80,69,53,255),width=max(1,w//25))
 if mat=='thread_web':
  d.line([(w*.1,h*.2),(w*.9,h*.8)],fill=(101,135,136,255),width=max(1,w//60));d.line([(w*.9,h*.2),(w*.1,h*.8)],fill=(101,135,136,255),width=max(1,w//60))
 if part=='head' and ci==0 and face in ('west','east') and mat in ('copper_head','iron_dark','shadow_head','conductor_head','thread_head','rain_fur','arc_head','glide_head'):
  d.polygon([(w*.22,h*.3),(w*.65,h*.34),(w*.58,h*.48),(w*.3,h*.46)],fill=(32,40,44,255))
  d.polygon([(w*.3,h*.35),(w*.58,h*.38),(w*.54,h*.44),(w*.33,h*.43)],fill=(243,203,121,255))
 if part=='head' and ci==0 and face=='north' and mat in ('giant_dark','crusher_dark','horn_dark','wall_dark'):
  for x in (.3,.7):d.polygon([(w*(x-.1),h*.33),(w*(x+.1),h*.38),(w*(x+.08),h*.48),(w*(x-.08),h*.44)],fill=(234,196,108,255))
 return im

def material(mat):return (140,0,150,255) if mat in METAL else (0,0,190,255)
def build(i):return bake(f'foe_4_{i}',f'f4_{i}_',DESIGNS[i](),paint,material)
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 for i in range(len(DESIGNS)):
  for path,data in build(i).items():
   if a.write:path.write_bytes(data)
   elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Storm foe art stale: '+str(path))
 print(f'{len(DESIGNS)} storm foe prototypes: {len(DESIGNS)*4} files '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
