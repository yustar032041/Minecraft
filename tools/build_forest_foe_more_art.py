#!/usr/bin/env python3
"""Nine forest foes, individually authored prototype rigs and procedural maps.

Only geometry/color/MER/normal are written; combat and collision are untouched.
"""
import argparse
from PIL import ImageDraw
from build_forest_wild_art import c,bone,bake,PALETTE,surface,tint
PALETTE.update({
 'king_hide':(72,91,70),'king_shell':(66,99,69),'king_moss':(109,145,83),'king_horn':(158,160,110),'king_dark':(44,59,50),
 'indigo_fur':(48,55,89),'indigo_head':(62,69,110),'indigo_tail':(67,75,122),'indigo_mark':(153,174,194),'indigo_dark':(34,39,65),
 'phosphor_body':(61,90,77),'phosphor_head':(87,123,105),'phosphor_wing':(87,133,117),'phosphor_tip':(146,185,151),'phosphor_cap':(175,193,124),'phosphor_dark':(43,59,56),
 'silk_body':(174,183,177),'silk_head':(142,161,159),'silk_joint':(106,129,132),'silk_web':(214,225,216),'silk_dark':(64,90,95),
 'hare_wood':(108,91,69),'hare_bark':(77,74,61),'hare_inner':(159,130,93),'hare_moss':(94,122,70),'hare_time':(207,188,122),
 'mask_body':(53,75,76),'mask_robe':(75,100,94),'mask_dark':(38,52,55),'mask_face':(177,195,174),'mask_trim':(117,163,151),
 'swamp_body':(83,100,75),'swamp_head':(113,130,92),'swamp_feather':(111,144,112),'swamp_tip':(168,181,128),'swamp_glow':(224,190,103),'swamp_dark':(56,66,53),
 'shade_body':(48,52,51),'shade_head':(71,76,67),'shade_coat':(72,91,75),'shade_bone':(166,171,139),'shade_dark':(31,38,36),
 'moss_spider':(48,89,83),'moss_head':(65,112,100),'moss_joint':(50,76,71),'moss_stitch':(154,203,178),'moss_eye':(194,219,157),
})

def shell_king():
 b=[bone('body',[0,5,0],[c([-3.6,2.4,-3],[7.2,4.5,8.1],'king_hide'),c([-3.9,6.2,-2.8],[7.8,1.4,7.5],'king_shell')]),
    bone('head',[0,5,-2.8],[c([-2.4,3.5,-5.9],[4.8,3.2,3.3],'king_hide'),c([-1.1,4.5,-7.5],[2.2,1,1.9],'king_horn')],'body'),
    bone('shell_l',[ -1.8,7,0],[c([-3.9,7,-2.5],[3.9,1.3,6.5],'king_shell'),c([-3.2,8,-1.8],[3.2,.7,5.2],'king_moss')],'body'),
    bone('shell_r',[ 1.8,7,0],[c([0,7,-2.5],[3.9,1.3,6.5],'king_shell'),c([0,8,-1.8],[3.2,.7,5.2],'king_moss')],'body'),
    bone('crown',[0,7,-3.5],[c([-2.2,6.2,-4.3],[4.4,.9,1.4],'king_horn'),c([-2.2,6.8,-4.3],[.8,1.3,1.4],'king_horn'),c([1.4,6.8,-4.3],[.8,1.3,1.4],'king_horn')],'head')]
 for i,(x,z) in enumerate([(-3,-1.8),(3,-1.8),(-3,.8),(3,.8),(-3,3.4),(3,3.4)]):
  b.append(bone(f'leg_{i}',[x,3.5,z],[c([x-.8,.5,z-.7],[1.6,3.1,1.4],'king_hide'),c([x-.95,0,z-1],[1.9,.7,1.8],'king_dark')],'body'))
 return b

def indigo_hunter():
 b=[bone('body',[0,6,0],[c([-2.6,4,-3],[5.2,4.5,8.3],'indigo_fur'),c([-2.8,7.5,-2.6],[5.6,.9,3.5],'indigo_head')]),
    bone('head',[0,7,-3],[c([-2,6,-6.3],[4,3.5,3.7],'indigo_head'),c([-1,6,-8],[2,1.2,2],'indigo_mark'),c([-1.9,9,-5.5],[.9,2,1],'indigo_dark'),c([1,9,-5.5],[.9,2,1],'indigo_dark')],'body'),
    bone('tail',[0,6.5,5],[c([-1.1,5.5,4.8],[2.2,2,3.7],'indigo_tail')],'body'),
    bone('tail_mid',[0,6.4,8.1],[c([-1.7,5,8],[3.4,3,3.7],'indigo_tail')],'tail'),
    bone('tail_tip',[0,6.3,11.3],[c([-2.1,4.6,11.2],[4.2,3.6,2.5],'indigo_tail'),c([-2,4.7,13.2],[4,3.4,.8],'indigo_mark')],'tail_mid'),
    bone('shoulder',[0,7,-2],[c([-3,6,-3],[6,2.2,2.8],'indigo_dark')],'body')]
 for i,(x,z) in enumerate([(-1.8,-1.8),(1.8,-1.8),(-1.8,3.7),(1.8,3.7)]):
  b.append(bone(f'leg_{i}',[x,4.3,z],[c([x-.65,.6,z-.6],[1.3,3.8,1.2],'indigo_fur'),c([x-.75,0,z-.9],[1.5,.8,1.7],'indigo_dark')],'body'))
 return b

def phosphor_wing():
 b=[bone('body',[0,6,0],[c([-2.5,3.5,-2.6],[5,5,5.8],'phosphor_body'),c([-1.8,2.3,1.8],[3.6,2,3.4],'phosphor_cap')]),
    bone('head',[0,7,-2.4],[c([-1.8,6,-5.2],[3.6,3.4,3.2],'phosphor_head'),c([-.6,6.4,-6.4],[1.2,.8,1.5],'phosphor_dark'),c([-1.9,9,-4.7],[3.8,.8,2.8],'phosphor_cap'),c([-.65,9.6,-3.8],[1.3,2.4,1.3],'phosphor_wing')],'body'),
    bone('tail',[0,5,3],[c([-2,4.7,2.8],[4,.7,3.1],'phosphor_tip')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-6.3 if sign<0 else 2.3;tip=-9.3 if sign<0 else 6
  b.append(bone('wing_'+side,[sign*2.3,7,0],[c([x,6,-2],[4,1,5],'phosphor_wing'),c([x,5.7,2],[4,.6,1.3],'phosphor_cap')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*6,6.5,0],[c([tip,5.9,-1.5],[3.3,.9,4.4],'phosphor_tip'),c([tip,5.7,2.4],[3,.5,1.2],'phosphor_cap')],'wing_'+side))
 for i,x in enumerate((-1.1,1.1)):
  b.append(bone(f'leg_{i}',[x,3.7,.6],[c([x-.4,.4,.2],[.8,3.4,.8],'phosphor_dark'),c([x-.6,0,-.6],[1.2,.6,1.8],'phosphor_dark')],'body'))
 return b

def mist_spider():
 b=[bone('body',[0,4,1],[c([-3,2.8,-2],[6,3,5.5],'silk_body'),c([-3.7,2.5,2],[7.4,4,5.4],'silk_body'),c([-3.3,6,2.7],[6.6,.7,3.8],'silk_web')]),
    bone('head',[0,4,-2],[c([-2.6,2.8,-5],[5.2,2.7,3.5],'silk_head'),c([-2.1,2,-5.2],[1.1,1.1,1.4],'silk_dark'),c([1,2,-5.2],[1.1,1.1,1.4],'silk_dark')],'body'),
    bone('spindle',[0,4,7],[c([-1.4,3.3,6.7],[2.8,1.6,2.3],'silk_joint'),c([-.8,3.6,8.5],[1.6,1,1.5],'silk_web')],'body')]
 for i in range(8):
  side=-1 if i%2==0 else 1;z=-1.4+(i//2)*2; x=-5 if side<0 else 2.7
  b.append(bone(f'leg_{i}',[side*2.7,4,z],[c([x,3,z-.45],[2.3,1.2,.9],'silk_joint')],'body'))
  outer=-5.5 if side<0 else 4.6
  b.append(bone(f'leg_tip_{i}',[side*4.8,3.5,z],[c([outer,.4,z-.5],[.9,3,.95],'silk_joint'),c([outer-.1,0,z-.7],[1.1,.6,1.3],'silk_dark')],f'leg_{i}'))
 return b

def time_hare():
 b=[bone('body',[0,4,0],[c([-2.6,2.4,-2.8],[5.2,3.8,6.8],'hare_wood'),c([-2.7,5.7,-2.3],[5.4,.7,5.5],'hare_moss')]),
    bone('head',[0,5,-2.6],[c([-2,4,-5.5],[4,3.4,3.3],'hare_wood'),c([-.8,4,-6.6],[1.6,1,1.4],'hare_inner')],'body'),
    bone('tail',[0,4,3.8],[c([-.9,3.4,3.6],[1.8,1.8,1.5],'hare_moss')],'body'),
    bone('clock',[0,5.5,.5],[c([-1.2,5.8,-.6],[2.4,.6,2.4],'hare_time')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-1.7 if sign<0 else .6
  b.append(bone('ear_'+side,[sign*1.1,7,-4],[c([x,7,-4.8],[1.1,4,1.3],'hare_bark'),c([x+.2,7.7,-5],[.7,2.5,.35],'hare_inner')],'head'))
 for i,(x,z) in enumerate([(-1.6,-1.7),(1.6,-1.7),(-1.6,2.7),(1.6,2.7)]):
  b.append(bone(f'leg_{i}',[x,2.7,z],[c([x-.6,.4,z-.6],[1.2,2.4,1.2],'hare_wood'),c([x-.7,0,z-1],[1.4,.6,1.8],'hare_bark')],'body'))
 return b

def mask_soldier():
 b=[bone('body',[0,10,0],[c([-3.6,5.4,-2.3],[7.2,8,4.6],'mask_body'),c([-3.9,5,-2.5],[7.8,2,5],'mask_robe'),c([-2.2,10,-2.7],[4.4,1,.6],'mask_trim')]),
    bone('head',[0,13,0],[c([-2.5,12.7,-2.2],[5,4,4],'mask_dark'),c([-2.1,13,-2.8],[4.2,3.1,.8],'mask_face'),c([-2.7,16.2,-2.4],[5.4,.6,4.3],'mask_trim')],'body'),
    bone('mantle',[0,12,2],[c([-3.6,6,2],[7.2,6.5,.9],'mask_robe')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-6.3 if sign<0 else 3.5
  b.append(bone('arm_'+side,[sign*3.5,12,0],[c([x,7,-1.8],[2.8,5.2,3.6],'mask_body'),c([x-.1,10.5,-2],[3,1.7,4],'mask_trim')],'body'))
  b.append(bone('forearm_'+side,[sign*4.8,7,0],[c([x,4.5,-1.8],[2.8,2.7,3.6],'mask_robe'),c([x,4,-1.8],[2.8,.8,3.6],'mask_dark')],'arm_'+side))
 for i,x in enumerate((-1.8,1.8)):
  b.append(bone(f'leg_{i}',[x,5.5,0],[c([x-1.1,.6,-1.3],[2.2,5,2.6],'mask_body'),c([x-1.2,0,-1.8],[2.4,.8,3.2],'mask_dark')],'body'))
 return b
def swamp_bird():
 b=[bone('body',[0,6,0],[c([-2.3,3.5,-2.5],[4.6,4.5,6.3],'swamp_body'),c([-1.5,3.2,2],[3,1.1,3.3],'swamp_tip')]),
    bone('head',[0,7,-2.2],[c([-1.5,6,-5.4],[3,4,3.4],'swamp_head'),c([-.7,6.5,-7.3],[1.4,.9,2.2],'swamp_glow'),c([-1.4,9.6,-4.9],[2.8,.8,3],'swamp_tip')],'body'),
    bone('lantern',[0,4.5,-1],[c([-1.1,2.6,-2.9],[2.2,2,1],'swamp_dark'),c([-.75,2.9,-3.2],[1.5,1.4,.6],'swamp_glow')],'body'),
    bone('tail',[0,5,3.5],[c([-1.7,4.6,3],[3.4,.8,3.7],'swamp_feather'),c([-2.5,4.4,5.8],[5,.6,2.1],'swamp_tip')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-5.7 if sign<0 else 2.1;tip=-8.9 if sign<0 else 5.4
  b.append(bone('wing_'+side,[sign*2.1,6,0],[c([x,5.4,-1.7],[3.6,1.1,4.6],'swamp_feather'),c([x,5.1,2.3],[3.6,.5,1.3],'swamp_glow')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*5.4,6,0],[c([tip,5.3,-1],[3.5,.8,4.4],'swamp_tip'),c([tip,5.1,2.8],[3.2,.5,1],'swamp_glow')],'wing_'+side))
 for i,x in enumerate((-1.1,1.1)):
  b.append(bone(f'leg_{i}',[x,3.6,.5],[c([x-.35,.4,.1],[.7,3.3,.8],'swamp_dark'),c([x-.6,0,-.6],[1.2,.6,1.8],'swamp_dark')],'body'))
 return b

def lost_hunter():
 b=[bone('body',[0,7,0],[c([-2.6,5,-3.6],[5.2,4.4,8.8],'shade_body'),c([-3,7.6,-3.4],[6,2,3.5],'shade_coat')]),
    bone('head',[0,8,-3.2],[c([-2,7,-6.7],[4,3.4,4],'shade_head'),c([-1.2,7,-8.8],[2.4,1.4,2.5],'shade_dark'),c([-1.8,10,-5.8],[1,1.9,1.2],'shade_dark'),c([.8,10,-5.8],[1,1.9,1.2],'shade_dark')],'body'),
    bone('back_ridge',[0,9,-1],[c([-1.8,9,-1.5],[3.6,.9,4.7],'shade_coat'),c([-.7,9.6,0],[1.4,1.4,2.2],'shade_bone')],'body'),
    bone('tail',[0,7,5],[c([-.8,6.3,4.8],[1.6,1.5,3.5],'shade_dark')],'body'),
    bone('tail_blade',[0,7,8],[c([-1.5,6,7.8],[3,2.1,3.4],'shade_coat'),c([-.9,6.3,10.5],[1.8,1.5,2.2],'shade_bone')],'tail')]
 for i,(x,z) in enumerate([(-1.8,-2.3),(1.8,-2.3),(-1.8,3.8),(1.8,3.8)]):
  b.append(bone(f'leg_{i}',[x,5.3,z],[c([x-.6,2.1,z-.6],[1.2,3.3,1.2],'shade_body')],'body'))
  b.append(bone(f'hock_{i}',[x,2.2,z],[c([x-.5,.5,z-.5],[1,1.8,1],'shade_dark'),c([x-.7,0,z-.95],[1.4,.7,1.7],'shade_dark')],f'leg_{i}'))
 return b

def sewing_spider():
 b=[bone('body',[0,4,0],[c([-2.9,2.8,-2],[5.8,3.3,5.3],'moss_spider'),c([-3.2,2.5,2],[6.4,3.9,5.3],'moss_spider'),c([-2.8,6,2.6],[5.6,.7,4],'moss_head')]),
    bone('head',[0,4,-1.8],[c([-2.3,2.8,-4.9],[4.6,2.7,3.2],'moss_head'),c([-1.8,2,-5.1],[1,1.1,1.2],'moss_joint'),c([.8,2,-5.1],[1,1.1,1.2],'moss_joint')],'body'),
    bone('needle',[0,4,7],[c([-.8,3.4,6.9],[1.6,1.2,2.2],'moss_joint'),c([-.35,3.7,8.7],[.7,.6,2.7],'moss_stitch')],'body'),
    bone('moss_crown',[0,6,4],[c([-2.2,6.4,3],[4.4,.7,3.4],'moss_head'),c([-1.4,6.9,3.7],[2.8,.5,2],'moss_eye')],'body')]
 for i in range(8):
  side=-1 if i%2==0 else 1;z=-1.3+(i//2)*2;x=-5.2 if side<0 else 2.6
  b.append(bone(f'leg_{i}',[side*2.6,4,z],[c([x,3.2,z-.45],[2.6,1.1,.9],'moss_joint')],'body'))
  outer=-5.7 if side<0 else 4.7
  b.append(bone(f'leg_tip_{i}',[side*4.8,3.5,z],[c([outer,.4,z-.5],[1,3.1,1],'moss_joint'),c([outer-.1,0,z-.65],[1.2,.6,1.3],'moss_spider')],f'leg_{i}'))
 return b
DESIGNS={3:shell_king,4:indigo_hunter,5:phosphor_wing,6:mist_spider,7:time_hare,8:mask_soldier,9:swamp_bird,10:lost_hunter,11:sewing_spider}

def paint(mat,w,h,seed,face,part,ci):
 no_eye=mat in ('mask_dark','mask_face','silk_head','king_hide','indigo_head','hare_wood','phosphor_head','shade_head','moss_head')
 im=surface(mat,w,h,seed,face,'no_generic_eye' if no_eye else part,ci);d=ImageDraw.Draw(im);base=PALETTE[mat]
 if mat in ('king_shell','king_moss','hare_bark'):
  for j in range(1,5):
   x=w*j/5;d.line([(x,0),(x-w*.05,h*.4),(x+w*.02,h*.8)],fill=(*tint(base,-24),255),width=max(1,w//75))
 if mat in ('indigo_tail','indigo_fur') and face in ('west','east','up'):
  d.line([(w*.15,h*.25),(w*.4,h*.65),(w*.64,h*.25),(w*.85,h*.5)],fill=(131,154,182,255),width=max(1,w//48))
 if mat in ('phosphor_wing','phosphor_cap'):
  for x,y in ((.2,.3),(.7,.25),(.48,.6),(.8,.8)):
   r=max(1,min(w,h)//22);d.ellipse((w*x-r,h*y-r,w*x+r,h*y+r),fill=(222,227,169,255))
 if mat in ('moss_spider','moss_head') and face in ('up','west','east'):
  for j in range(1,5):
   x=w*j/5;d.line([(x-w*.08,h*.22),(x+w*.08,h*.4)],fill=(153,204,178,255),width=max(1,w//55));d.line([(x+w*.08,h*.22),(x-w*.08,h*.4)],fill=(153,204,178,255),width=max(1,w//55))
 if mat=='silk_web':
  for j in range(1,4):d.line([(w*j/4,0),(w*(1-j/4),h)],fill=(158,183,181,255),width=max(1,w//75))
 if mat=='hare_time' and face in ('up','north','south'):
  d.ellipse((w*.18,h*.18,w*.82,h*.82),outline=(93,82,61,255),width=max(1,w//18));d.line([(w*.5,h*.25),(w*.5,h*.5),(w*.7,h*.62)],fill=(93,82,61,255),width=max(1,w//18))
 if mat=='mask_face' and part=='head' and face in ('north','south'):
  for x in (.3,.7):d.rectangle((w*(x-.1),h*.28,w*(x+.1),h*.45),fill=(38,73,70,255))
  d.polygon([(w*.5,h*.5),(w*.36,h*.78),(w*.5,h*.68),(w*.64,h*.78)],fill=(82,111,99,255))
 if part=='head' and ci==0 and mat in ('king_hide','indigo_head','silk_head','hare_wood','phosphor_head','shade_head','moss_head') and face in ('west','east'):
  col={'king_hide':(212,203,128,255),'indigo_head':(173,215,225,255),'silk_head':(89,126,135,255),'hare_wood':(221,193,127,255),'phosphor_head':(218,229,153,255),'shade_head':(183,210,157,255),'moss_head':(191,224,160,255)}[mat]
  d.polygon([(w*.22,h*.3),(w*.63,h*.34),(w*.57,h*.46),(w*.3,h*.45)],fill=col)
 return im

def build(i):return bake(f'foe_1_{i}',f'f1_{i}_',DESIGNS[i](),paint)
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 for i in DESIGNS:
  for path,data in build(i).items():
   if a.write:path.write_bytes(data)
   elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Forest foe art stale: '+str(path))
 print('Nine forest foe prototypes: 36 files '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
