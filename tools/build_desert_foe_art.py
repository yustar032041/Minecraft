#!/usr/bin/env python3
"""Individually authored desert foe appearance prototypes (0..11).

Produces geometry and procedural color/MER/normal only; no gameplay edits.
Requires Pillow. Images and motion are draft studies, not finished art.
"""
import argparse
from PIL import ImageDraw
from build_forest_wild_art import c,bone,bake,PALETTE,surface,tint
from refine_mob_anatomy import refine_baked
PALETTE.update({
 'burrow_body':(96,76,59),'burrow_shell':(169,128,75),'burrow_band':(211,171,105),'burrow_claw':(72,61,52),'burrow_horn':(231,192,123),
 'chase_fur':(174,92,61),'chase_belly':(223,173,124),'chase_ear':(132,70,56),'chase_dark':(81,55,48),'chase_mark':(238,200,146),
 'lancer_stone':(146,89,61),'lancer_plate':(188,124,75),'lancer_dark':(83,62,54),'lancer_horn':(228,187,115),'lancer_rune':(229,165,79),
 'break_body':(100,61,48),'break_shell':(145,67,48),'break_band':(198,112,69),'break_horn':(219,168,110),'break_dark':(70,47,42),
 'haze_skin':(193,153,101),'haze_band':(149,103,65),'haze_dark':(95,74,58),'haze_tail':(207,173,123),'haze_eye':(239,202,123),
 'hot_body':(128,79,61),'hot_head':(171,106,67),'hot_wing':(182,115,70),'hot_feather':(219,157,88),'hot_beak':(231,196,129),'hot_dark':(78,59,49),
 'dune_spider':(152,80,62),'dune_spider_head':(169,102,74),'dune_joint':(101,66,56),'dune_web':(232,183,130),'dune_pale':(218,196,162),
 'hour_fur':(173,145,106),'hour_dark':(100,79,62),'hour_ear':(199,161,132),'hour_belly':(225,204,162),'hour_clock':(223,183,105),
 'sandking_body':(107,83,56),'sandking_shell':(171,130,70),'sandking_layer':(210,170,100),'sandking_dark':(75,59,48),'sandking_horn':(232,204,145),
 'mirage_fur':(182,148,99),'mirage_dark':(102,77,59),'mirage_head':(159,120,82),'mirage_mark':(231,205,158),'mirage_tail':(124,93,68),
 'scorch_body':(102,66,56),'scorch_head':(164,89,61),'scorch_wing':(188,91,57),'scorch_tip':(235,156,77),'scorch_bone':(239,205,142),'scorch_dark':(65,48,45),
 'demon_body':(116,67,52),'demon_plate':(171,101,65),'demon_dark':(69,49,46),'demon_horn':(218,178,123),'demon_core':(216,140,71),
})

def burrower():
 # Low, shovel-headed beetle; six articulated digging limbs and shield shell.
 b=[bone('body',[0,3.6,.4],[c([-3.2,2,-3],[6.4,3.1,7.7],'burrow_body'),c([-3.5,4.7,-2.8],[7,1,7.2],'burrow_shell')]),
    bone('head',[0,3.6,-2.9],[c([-2.4,2.4,-5.4],[4.8,2.5,2.8],'burrow_body'),c([-2,2.1,-6.5],[4,.8,1.5],'burrow_claw')],'body'),
    bone('drill',[0,3.5,-5],[c([-.9,3,-6.7],[1.8,1,2.3],'burrow_horn'),c([-.5,3.1,-8.3],[1,.7,1.8],'burrow_band')],'head'),
    bone('shell_l',[-.2,5.4,0],[c([-3.4,5.4,-2.5],[3.4,.9,6.7],'burrow_shell'),c([-2.9,6,-1.8],[2.9,.6,5.1],'burrow_band')],'body'),
    bone('shell_r',[.2,5.4,0],[c([0,5.4,-2.5],[3.4,.9,6.7],'burrow_shell'),c([0,6,-1.8],[2.9,.6,5.1],'burrow_band')],'body')]
 for i in range(6):
  side=-1 if i%2==0 else 1;z=(-2,0,2.3)[i//2];outer=-5.4 if side<0 else 2.9;foot=-6 if side<0 else 4.8
  b.append(bone(f'leg_{i}',[side*3,3,z],[c([outer,2.1,z-.45],[2.5,.9,.9],'burrow_body')],'body'))
  b.append(bone(f'claw_{i}',[side*5,2.5,z],[c([foot,.3,z-.65],[1.2,2.3,1.3],'burrow_claw'),c([foot-.2,0,z-1],[1.6,.5,1.8],'burrow_horn')],f'leg_{i}'))
 return b

def red_rabbit():
 b=[bone('body',[0,4.5,0],[c([-2.6,2.5,-2.4],[5.2,4.3,6.8],'chase_fur'),c([-2,2.2,-1.7],[4,.6,5],'chase_belly')]),
    bone('head',[0,6,-2.4],[c([-2,5,-5.6],[4,3.4,3.5],'chase_fur'),c([-.9,5,-6.7],[1.8,1,1.5],'chase_belly')],'body'),
    bone('tail',[0,4.7,4],[c([-.8,4,3.9],[1.6,1.5,1.7],'chase_belly')],'body'),
    bone('crest',[0,7.7,-2.2],[c([-1.2,7.5,-3.1],[2.4,.7,2.2],'chase_mark')],'head')]
 for side,sign in [('l',-1),('r',1)]:
  x=-1.7 if sign<0 else .6
  b.append(bone('ear_'+side,[sign*1.1,8,-4],[c([x,7.8,-4.7],[1.1,4.4,1.3],'chase_fur'),c([x+.15,8.3,-4.9],[.8,3.3,.35],'chase_ear')],'head'))
 for i,(x,z) in enumerate([(-1.6,-1.3),(1.6,-1.3),(-1.8,2.8),(1.8,2.8)]):
  width=1.2 if i<2 else 1.9
  b.append(bone(f'leg_{i}',[x,3,z],[c([x-width/2,.6,z-.6],[width,2.5,1.2],'chase_fur'),c([x-width/2,0,z-1.2],[width,.8,1.9],'chase_dark')],'body'))
 return b

def horn_lancer():
 b=[bone('body',[0,10,0],[c([-3.7,5.5,-2.5],[7.4,8.3,5],'lancer_stone'),c([-3.9,10.2,-2.9],[7.8,2.3,.7],'lancer_plate'),c([-1.2,7.6,-3.1],[2.4,2,.6],'lancer_rune')]),
    bone('head',[0,13.6,0],[c([-2.7,13.1,-2.4],[5.4,4.4,4.5],'lancer_dark'),c([-2.6,15.6,-2.7],[5.2,1.4,5],'lancer_plate')],'body'),
    bone('nose_horn',[0,15,-2],[c([-.65,14.7,-4],[1.3,1.3,2],'lancer_horn'),c([-.4,14.9,-5.3],[.8,.9,1.4],'lancer_horn')],'head')]
 for side,sign in [('l',-1),('r',1)]:
  x=-6.5 if sign<0 else 3.7
  b.append(bone('arm_'+side,[sign*3.7,12,0],[c([x,7,-2],[2.8,5.2,4],'lancer_stone'),c([x,10.5,-2.4],[2.8,1.8,4.8],'lancer_plate')],'body'))
  b.append(bone('forearm_'+side,[sign*5.1,7,0],[c([x,4.3,-2],[2.8,2.9,4],'lancer_dark'),c([x-.15,4,-2.2],[3.1,1,4.4],'lancer_plate')],'arm_'+side))
 for i,x in enumerate((-1.9,1.9)):
  b.append(bone(f'leg_{i}',[x,5.6,0],[c([x-1.2,.8,-1.4],[2.4,5,2.8],'lancer_stone'),c([x-1.3,0,-1.8],[2.6,1,3.5],'lancer_dark')],'body'))
 return b

def red_breaker():
 b=[bone('body',[0,4,0],[c([-3.4,2,-3],[6.8,3.4,8],'break_body'),c([-3.7,5,-2.7],[7.4,1.3,7.2],'break_shell')]),
    bone('head',[0,4,-2.8],[c([-2.5,2.8,-5.6],[5,2.8,3],'break_body'),c([-2.2,4.8,-5],[4.4,.8,2],'break_band')],'body'),
    bone('horn_l',[-1.5,4,-4.6],[c([-2,3.3,-7],[1,1.2,2.4],'break_horn'),c([-2,3.4,-8],[1,.9,1.4],'break_dark')],'head'),
    bone('horn_r',[1.5,4,-4.6],[c([1,3.3,-7],[1,1.2,2.4],'break_horn'),c([1,3.4,-8],[1,.9,1.4],'break_dark')],'head'),
    bone('shell_l',[-.1,6,0],[c([-3.7,6,-2.3],[3.7,1,6.4],'break_shell'),c([-3.2,6.8,-1.4],[3.1,.7,4.6],'break_band')],'body'),
    bone('shell_r',[.1,6,0],[c([0,6,-2.3],[3.7,1,6.4],'break_shell'),c([.1,6.8,-1.4],[3.1,.7,4.6],'break_band')],'body'),
    bone('ridge',[0,7,0],[c([-1,7.2,-1.2],[2,1.1,4.2],'break_shell'),c([-.6,8.2,.4],[1.2,1.2,1.5],'break_horn')],'body')]
 for i in range(6):
  side=-1 if i%2==0 else 1;z=(-1.8,.3,2.6)[i//2];x=-5.4 if side<0 else 3.1;foot=-5.9 if side<0 else 4.7
  b.append(bone(f'leg_{i}',[side*3.1,3.3,z],[c([x,2.1,z-.5],[2.3,1,.95],'break_body')],'body'))
  b.append(bone(f'claw_{i}',[side*4.8,2.6,z],[c([foot,.2,z-.65],[1.2,2.4,1.3],'break_dark'),c([foot-.15,0,z-.9],[1.5,.55,1.7],'break_horn')],f'leg_{i}'))
 return b

def haze_runner():
 # Low desert runner with a long, jointed tail and broad splayed feet.
 b=[bone('body',[0,3.5,0],[c([-2.4,2.5,-3],[4.8,2.8,7.5],'haze_skin'),c([-1.6,5,-2.4],[3.2,.6,5.7],'haze_band')]),
    bone('head',[0,4,-2.8],[c([-1.8,3.2,-5.4],[3.6,2.2,3],'haze_skin'),c([-1.2,3.2,-6.4],[2.4,.9,1.4],'haze_tail')],'body'),
    bone('tail',[0,3.5,4.3],[c([-1.1,2.8,4.1],[2.2,1.7,3.2],'haze_skin')],'body'),
    bone('tail_mid',[0,3.5,7],[c([-.8,3,6.8],[1.6,1.2,3.2],'haze_band')],'tail'),
    bone('tail_tip',[0,3.5,9.7],[c([-.5,3.1,9.5],[1,1,2.8],'haze_tail')],'tail_mid')]
 for i,(x,z) in enumerate([(-1.8,-1.7),(1.8,-1.7),(-1.8,3),(1.8,3)]):
  b.append(bone(f'leg_{i}',[x,3,z],[c([x-.5,.4,z-.5],[1,2.7,1],'haze_skin'),c([x-.8,0,z-.9],[1.6,.6,1.7],'haze_dark')],'body'))
 return b

def hot_bird():
 b=[bone('body',[0,5.5,0],[c([-2.1,3.4,-2.5],[4.2,4,5.8],'hot_body'),c([-1.6,3,1.7],[3.2,1,3],'hot_feather')]),
    bone('head',[0,6.4,-2],[c([-1.6,5.8,-5],[3.2,3,3.2],'hot_head'),c([-.6,6,-6.7],[1.2,.9,2],'hot_beak'),c([-.5,8.4,-4.3],[1,2,1.2],'hot_feather')],'body'),
    bone('tail',[0,4.8,3],[c([-1.5,4.5,2.8],[3,.7,3],'hot_wing'),c([-2.2,4.3,5.2],[4.4,.6,1.8],'hot_feather')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-5.8 if sign<0 else 2;tip=-9 if sign<0 else 5.4
  b.append(bone('wing_'+side,[sign*2,5.9,0],[c([x,5.2,-2],[3.8,1,4.8],'hot_wing'),c([x,4.9,2.2],[3.8,.5,1.1],'hot_feather')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*5.4,5.7,0],[c([tip,5.1,-1.4],[3.6,.8,4.4],'hot_feather'),c([tip,4.9,2.4],[3.3,.5,1.1],'hot_beak')],'wing_'+side))
 for i,x in enumerate((-1,1)):
  b.append(bone(f'leg_{i}',[x,3.5,.5],[c([x-.35,.4,.1],[.7,3.2,.8],'hot_dark'),c([x-.55,0,-.5],[1.1,.6,1.6],'hot_dark')],'body'))
 return b
def dune_spider():
 b=[bone('body',[0,4,0],[c([-2.9,2.6,-2.1],[5.8,3.1,5.2],'dune_spider'),c([-3.5,2.4,2],[7,3.7,5.5],'dune_spider'),c([-3,5.9,2.6],[6,.6,4],'dune_web')]),
    bone('head',[0,4,-2],[c([-2.3,2.6,-5],[4.6,2.7,3.3],'dune_spider_head'),c([-1.9,2,-5.4],[1,1,1.3],'dune_joint'),c([.9,2,-5.4],[1,1,1.3],'dune_joint')],'body'),
    bone('ice_seal',[0,6,4],[c([-1.8,6.3,3],[3.6,.7,2.8],'dune_pale')],'body'),
    bone('spinner',[0,4,7],[c([-.9,3.2,7],[1.8,1.5,2.2],'dune_joint'),c([-.5,3.5,8.8],[1,.9,1.3],'dune_web')],'body')]
 for i in range(8):
  side=-1 if i%2==0 else 1;z=-1.3+(i//2)*2;x=-5.1 if side<0 else 2.7;foot=-5.6 if side<0 else 4.6
  b.append(bone(f'leg_{i}',[side*2.7,3.7,z],[c([x,2.9,z-.45],[2.4,1.1,.9],'dune_joint')],'body'))
  b.append(bone(f'leg_tip_{i}',[side*4.8,3.3,z],[c([foot,.4,z-.5],[1,2.8,1],'dune_joint'),c([foot-.1,0,z-.7],[1.2,.6,1.4],'dune_pale')],f'leg_{i}'))
 return b

def hour_rabbit():
 b=[bone('body',[0,4,0],[c([-2.8,2.5,-2.5],[5.6,4.2,6.9],'hour_fur'),c([-2.1,2.2,-1.8],[4.2,.6,5],'hour_belly')]),
    bone('head',[0,6,-2.5],[c([-2,4.9,-5.5],[4,3.4,3.4],'hour_fur'),c([-.9,5,-6.6],[1.8,1,1.4],'hour_belly')],'body'),
    bone('tail',[0,4.7,4],[c([-.9,3.9,3.9],[1.8,1.7,1.5],'hour_belly')],'body'),
    bone('hourglass',[0,6.4,.6],[c([-1.6,6.4,-.8],[3.2,.7,3],'hour_dark'),c([-1.1,7,-.3],[2.2,.5,2],'hour_clock')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-1.8 if sign<0 else .6
  b.append(bone('ear_'+side,[sign*1.2,8,-4],[c([x,7.9,-4.7],[1.2,4.8,1.4],'hour_fur'),c([x+.2,8.4,-4.9],[.8,3.5,.3],'hour_ear')],'head'))
 for i,(x,z) in enumerate([(-1.7,-1.3),(1.7,-1.3),(-1.8,2.9),(1.8,2.9)]):
  w=1.2 if i<2 else 1.8
  b.append(bone(f'leg_{i}',[x,3,z],[c([x-w/2,.6,z-.6],[w,2.5,1.2],'hour_fur'),c([x-w/2,0,z-1.1],[w,.8,1.8],'hour_dark')],'body'))
 return b

def sand_king():
 b=[bone('body',[0,4,0],[c([-3.7,2,-3],[7.4,3.8,8.4],'sandking_body'),c([-4,5.5,-2.9],[8,1.3,8],'sandking_shell')]),
    bone('head',[0,4,-3],[c([-2.6,2.7,-5.8],[5.2,3,3.2],'sandking_body'),c([-.9,3.2,-7.5],[1.8,1.5,2],'sandking_horn')],'body'),
    bone('shell_l',[-.15,6.5,0],[c([-4,6.5,-2.6],[4,1.2,7.5],'sandking_shell'),c([-3.4,7.5,-1.8],[3.4,.8,5.8],'sandking_layer')],'body'),
    bone('shell_r',[.15,6.5,0],[c([0,6.5,-2.6],[4,1.2,7.5],'sandking_shell'),c([0,7.5,-1.8],[3.4,.8,5.8],'sandking_layer')],'body'),
    bone('crown',[0,8,1],[c([-2.5,8.1,-.8],[5,.8,3.8],'sandking_dark'),c([-2.5,8.8,-.5],[1,1.5,1.2],'sandking_horn'),c([1.5,8.8,-.5],[1,1.5,1.2],'sandking_horn'),c([-2.5,9.8,-.5],[5,.6,1.2],'sandking_horn')],'body')]
 for i in range(6):
  side=-1 if i%2==0 else 1;z=(-2,0,2.6)[i//2];x=-6 if side<0 else 3.5;foot=-6.5 if side<0 else 5.2
  b.append(bone(f'leg_{i}',[side*3.5,3.7,z],[c([x,2.5,z-.5],[2.5,1.2,1],'sandking_body')],'body'))
  b.append(bone(f'claw_{i}',[side*5.2,3,z],[c([foot,.4,z-.6],[1.4,2.7,1.2],'sandking_dark'),c([foot-.2,0,z-.9],[1.8,.7,1.7],'sandking_horn')],f'leg_{i}'))
 return b

def mirage_tracker():
 b=[bone('body',[0,6,0],[c([-2.5,4,-3.2],[5,4.2,8],'mirage_fur'),c([-2.7,7,-3],[5.4,1.3,3],'mirage_head')]),
    bone('head',[0,7,-3],[c([-1.9,6,-6.1],[3.8,3.2,3.5],'mirage_head'),c([-.9,6,-7.8],[1.8,1.1,2],'mirage_mark'),c([-1.8,8.8,-5.4],[.9,2,1],'mirage_dark'),c([.9,8.8,-5.4],[.9,2,1],'mirage_dark')],'body'),
    bone('tail',[0,6,4.5],[c([-.8,5.2,4.4],[1.6,1.6,3.1],'mirage_tail')],'body'),
    bone('tail_tip',[0,6,7.2],[c([-1.2,4.8,7.1],[2.4,2.3,3.2],'mirage_tail'),c([-1,5,9.8],[2,1.9,.9],'mirage_mark')],'tail'),
    bone('mark',[0,7,-3],[c([-1,8,-4.9],[2,.7,1.7],'mirage_mark')],'head')]
 for i,(x,z) in enumerate([(-1.8,-1.8),(1.8,-1.8),(-1.8,3.5),(1.8,3.5)]):
  b.append(bone(f'leg_{i}',[x,4.3,z],[c([x-.6,.6,z-.5],[1.2,3.8,1],'mirage_fur'),c([x-.7,0,z-.9],[1.4,.8,1.7],'mirage_dark')],'body'))
 return b

def scorch_wing():
 b=[bone('body',[0,6,0],[c([-2.4,3.4,-2.5],[4.8,4.8,6.2],'scorch_body'),c([-2,3,2],[4,1,3],'scorch_tip')]),
    bone('head',[0,7,-2.3],[c([-1.8,6,-5.2],[3.6,3.4,3.3],'scorch_head'),c([-.7,6.3,-7],[1.4,.9,2.1],'scorch_bone'),c([-.6,9,-4.4],[1.2,2.4,1.5],'scorch_tip')],'body'),
    bone('tail',[0,5,3.4],[c([-2,4.6,3.2],[4,.8,3.4],'scorch_wing'),c([-3,4.3,6],[6,.6,2.4],'scorch_tip')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-6.3 if sign<0 else 2.3;tip=-10 if sign<0 else 5.9
  b.append(bone('wing_'+side,[sign*2.3,6.4,0],[c([x,5.6,-2],[4,1.1,5.2],'scorch_wing'),c([x,5.3,2.6],[4,.5,1.3],'scorch_tip')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*5.9,6.1,0],[c([tip,5.5,-1.5],[4.1,.9,4.8],'scorch_tip'),c([tip,5.2,2.7],[3.8,.5,1.4],'scorch_bone')],'wing_'+side))
 for i,x in enumerate((-1.1,1.1)):
  b.append(bone(f'leg_{i}',[x,3.5,.5],[c([x-.4,.4,.1],[.8,3.2,.8],'scorch_dark'),c([x-.6,0,-.6],[1.2,.6,1.8],'scorch_dark')],'body'))
 return b

def sand_demon():
 b=[bone('body',[0,10,0],[c([-4.1,5.5,-2.6],[8.2,8.3,5.2],'demon_body'),c([-3.7,11,-3],[7.4,2,.7],'demon_plate'),c([-1.2,7.5,-2.9],[2.4,2.2,.6],'demon_core')]),
    bone('head',[0,13.7,0],[c([-2.8,13.2,-2.4],[5.6,4.5,4.6],'demon_dark'),c([-2.5,16.8,-2.1],[5,.7,4],'demon_plate')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-6.9 if sign<0 else 4.1;hx=-3.3 if sign<0 else 2.1
  b.append(bone('horn_'+side,[sign*2.5,17,-.5],[c([hx,16.8,-1.8],[1.2,2.4,1.5],'demon_horn'),c([-4 if sign<0 else 2.1,18.4,-1.8],[1.9,.8,1.5],'demon_horn')],'head'))
  b.append(bone('arm_'+side,[sign*4,12.5,0],[c([x,7,-2],[2.8,5.7,4],'demon_body'),c([x-.1,10.7,-2.3],[3,2,4.6],'demon_plate')],'body'))
  b.append(bone('forearm_'+side,[sign*5.4,7,0],[c([x,4.2,-2.1],[2.8,3,4.2],'demon_dark'),c([x-.2,4,-2.3],[3.2,1,4.6],'demon_plate')],'arm_'+side))
 for i,x in enumerate((-2,2)):
  b.append(bone(f'leg_{i}',[x,5.7,0],[c([x-1.3,.8,-1.4],[2.6,5,2.8],'demon_body'),c([x-1.4,0,-1.8],[2.8,1.1,3.5],'demon_dark')],'body'))
 return b
DESIGNS=[burrower,red_rabbit,horn_lancer,red_breaker,haze_runner,hot_bird,dune_spider,hour_rabbit,sand_king,mirage_tracker,scorch_wing,sand_demon]

def paint(mat,w,h,seed,face,part,ci):
 no_eye=mat in ('burrow_body','chase_fur','lancer_dark','break_body','haze_skin','hot_head','dune_spider_head','hour_fur','sandking_body','mirage_head','scorch_head','demon_dark')
 im=surface(mat,w,h,seed,face,'no_generic_eye' if no_eye else part,ci);d=ImageDraw.Draw(im);base=PALETTE[mat]
 if mat in ('burrow_shell','burrow_band','break_shell','break_band','sandking_shell','sandking_layer') and face in ('up','west','east'):
  for k in range(1,5):
   y=h*k/5;d.line([(0,y),(w*.45,y-h*.05),(w-1,y)],fill=(*tint(base,-28),255),width=max(1,h//70))
 if mat in ('chase_fur','haze_skin') and part=='body' and face in ('west','east'):
  for k in range(3):
   x=w*(.2+k*.22);d.line([(x,h*.2),(x+w*.07,h*.43),(x,h*.65)],fill=(*tint(base,-28),255),width=max(1,w//45))
 if mat in ('lancer_stone','lancer_plate'):
  d.line([(w*.17,h*.18),(w*.3,h*.35),(w*.27,h*.5),(w*.39,h*.7)],fill=(*tint(base,-29),255),width=max(1,w//70))
 if mat in ('hot_wing','hot_feather','scorch_wing','scorch_tip'):
  for k in range(1,5):
   x=w*k/5;d.line([(x,0),(x-w*.05,h*.5),(x,h)],fill=(*tint(base,-25),255),width=max(1,w//70))
 if part=='head' and ci==0 and face in ('west','east') and mat in ('burrow_body','chase_fur','break_body','haze_skin','hot_head','dune_spider_head','hour_fur','sandking_body','mirage_head','scorch_head'):
  d.polygon([(w*.22,h*.3),(w*.65,h*.35),(w*.58,h*.48),(w*.3,h*.46)],fill=(51,38,34,255))
  d.polygon([(w*.3,h*.35),(w*.58,h*.38),(w*.54,h*.44),(w*.33,h*.43)],fill=(244,206,129,255))
 if mat=='lancer_dark' and part=='head' and ci==0 and face in ('north','south'):
  for x in (.28,.72):d.polygon([(w*(x-.11),h*.35),(w*(x+.11),h*.38),(w*(x+.08),h*.49),(w*(x-.08),h*.47)],fill=(240,184,91,255))
 if mat=='demon_dark' and part=='head' and ci==0 and face in ('north','south'):
  for x in (.28,.72):d.polygon([(w*(x-.11),h*.35),(w*(x+.11),h*.38),(w*(x+.08),h*.49),(w*(x-.08),h*.47)],fill=(240,184,91,255))
 if mat=='hour_clock' and face=='up':
  d.line([(w*.3,h*.2),(w*.7,h*.2),(w*.32,h*.8),(w*.7,h*.8),(w*.3,h*.2)],fill=(117,83,47,255),width=max(1,w//18))
 if mat=='dune_web' and face in ('up','west','east'):
  d.line([(w*.15,h*.2),(w*.85,h*.8)],fill=(154,112,99,255),width=max(1,w//60));d.line([(w*.85,h*.2),(w*.15,h*.8)],fill=(154,112,99,255),width=max(1,w//60))
 if mat=='lancer_rune' and face in ('north','south'):
  d.line([(w*.5,h*.18),(w*.25,h*.5),(w*.5,h*.82),(w*.75,h*.5),(w*.5,h*.18)],fill=(117,70,42,255),width=max(1,w//18))
 return im

def build(i):
 name=f'foe_2_{i}'
 return refine_baked(name,bake(name,f'f2_{i}_',DESIGNS[i](),paint))
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 for i in range(len(DESIGNS)):
  for path,data in build(i).items():
   if a.write:path.write_bytes(data)
   elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Desert foe art stale: '+str(path))
 print(f'{len(DESIGNS)} desert foe prototypes: {len(DESIGNS)*4} files '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
