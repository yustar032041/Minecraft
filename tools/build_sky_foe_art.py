#!/usr/bin/env python3
"""Three individually authored sky-island foe prototypes; no gameplay edits."""
import argparse
from PIL import ImageDraw
from build_forest_wild_art import c,bone,bake,PALETTE,surface,tint
PALETTE.update({
 'sf_glide':(132,158,170),'sf_glide_dark':(74,103,126),'sf_glide_cream':(216,226,215),'sf_glide_wing':(170,198,202),'sf_glide_tip':(113,156,173),
 'sf_bird':(126,163,180),'sf_bird_head':(172,193,193),'sf_bird_wing':(91,143,169),'sf_bird_feather':(200,222,221),'sf_gold':(220,191,124),'sf_dark':(68,95,112),
 'sf_stone':(137,155,163),'sf_shadow':(91,116,131),'sf_cloud':(205,219,218),'sf_gale':(157,203,210),'sf_rune':(239,222,161)
})

def cloud_glider():
 # Long four-legged body with wing membranes and two-part feather tail.
 b=[bone('body',[0,6,0],[c([-2.4,4.2,-3.2],[4.8,3.8,8.4],'sf_glide'),c([-2.7,6.7,-3],[5.4,1.5,3.5],'sf_glide_cream')]),
    bone('head',[0,7,-2.8],[c([-1.9,6,-6.4],[3.8,3.1,3.8],'sf_glide'),c([-1,6,-8],[2,1.2,2],'sf_glide_dark'),c([-1.8,8.8,-5.4],[1,2,1.2],'sf_glide_cream'),c([.8,8.8,-5.4],[1,2,1.2],'sf_glide_cream')],'body'),
    bone('tail',[0,6.5,4.8],[c([-.8,5.7,4.6],[1.6,1.6,3.2],'sf_glide')],'body'),
    bone('tail_fan',[0,6.5,7.5],[c([-1.9,5.5,7.4],[3.8,1,3.3],'sf_glide_wing'),c([-2.5,5.3,9.8],[5,.7,1.7],'sf_glide_cream')],'tail')]
 for i,(x,z) in enumerate([(-1.7,-1.8),(1.7,-1.8),(-1.7,3.8),(1.7,3.8)]):
  b.append(bone(f'leg_{i}',[x,4.4,z],[c([x-.55,.5,z-.5],[1.1,4.1,1],'sf_glide'),c([x-.7,0,z-1],[1.4,.7,1.8],'sf_glide_dark')],'body'))
 for side,sign in [('l',-1),('r',1)]:
  x=-6.8 if sign<0 else 2.2;tip=-10.3 if sign<0 else 6.2
  b.append(bone('wing_'+side,[sign*2.2,7,0],[c([x,6.7,-2.1],[4.6,.6,5.6],'sf_glide_wing'),c([x,6.5,-2.2],[4.6,.6,.7],'sf_glide_dark')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*6.2,7,0],[c([tip,6.6,-1.4],[4.1,.5,4.9],'sf_glide_tip'),c([tip,6.4,2.8],[4.1,.5,1.1],'sf_glide_cream')],'wing_'+side))
 return b

def wind_ring_bird():
 # Upright raptor with folded wings and a broken ring crest behind its head.
 b=[bone('body',[0,5.5,0],[c([-2.5,2.7,-2.5],[5,5.7,5.8],'sf_bird'),c([-2,3,-2.9],[4,4,.6],'sf_bird_feather')]),
    bone('head',[0,8,-2],[c([-2,7.8,-4.5],[4,3.4,3.6],'sf_bird_head'),c([-.6,8,-6.1],[1.2,1.1,1.9],'sf_gold'),c([-.5,10.9,-3.6],[1,1.7,1],'sf_bird_feather')],'body'),
    bone('tail',[0,4,3],[c([-1.8,3.7,2.8],[3.6,.8,2.5],'sf_bird_wing'),c([-2.5,3.5,4.8],[5,.6,1.8],'sf_bird_feather')],'body'),
    bone('wind_ring',[0,10,0],[c([-3,8.8,.1],[.8,3.2,.8],'sf_gold'),c([2.2,8.8,.1],[.8,3.2,.8],'sf_gold'),c([-3,11.7,.1],[6,.7,.8],'sf_gold'),c([-3,8.5,.1],[2,.6,.8],'sf_gold'),c([1,8.5,.1],[2,.6,.8],'sf_gold'),c([-1,8.1,.1],[2,.6,.8],'sf_dark')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-4 if sign<0 else 2.4;tip=-4.1 if sign<0 else 2.6
  b.append(bone('wing_'+side,[sign*2.4,7,0],[c([x,3.8,-1.7],[1.6,3.5,4.2],'sf_bird_wing')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*3.2,4.4,0],[c([tip,2.6,-1],[1.5,1.7,3.4],'sf_bird_feather')],'wing_'+side))
 for i,x in enumerate((-1.1,1.1)):
  b.append(bone(f'leg_{i}',[x,2.8,.4],[c([x-.4,.5,0],[.8,2.5,.9],'sf_dark'),c([x-.7,0,-.8],[1.4,.7,1.9],'sf_gold')],'body'))
 return b

def gust_ogre():
 # Wind-eroded stone body, asymmetric cloud shoulder and elongated arms.
 b=[bone('body',[0,10,0],[c([-4,5,-2.6],[8,8.6,5.2],'sf_stone'),c([-4.4,11,-3],[8.8,2.2,6],'sf_cloud'),c([-1.3,7.1,-3.1],[2.6,2.5,.7],'sf_rune')]),
    bone('head',[0,13.8,0],[c([-2.7,13.2,-2.4],[5.4,4.3,4.5],'sf_shadow'),c([-2.6,17.1,-2],[5.2,1,4],'sf_cloud')],'body'),
    bone('cloud_crest',[0,17,.5],[c([-1.5,17.8,-.5],[3,1.6,2.4],'sf_cloud'),c([-.8,19.2,0],[1.6,.9,1.5],'sf_gale')],'head'),
    bone('shoulder_gust',[3.8,12,0],[c([3.7,11.3,-2.5],[3,2.1,5],'sf_cloud'),c([4.7,13.2,-1.4],[2,1.2,3],'sf_gale')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-7.2 if sign<0 else 3.9
  b.append(bone('arm_'+side,[sign*4,12.5,0],[c([x,6,-1.9],[3.3,6.7,3.8],'sf_stone')],'body'))
  b.append(bone('fist_'+side,[sign*5.6,6,0],[c([x-.15,3.7,-2.2],[3.6,2.7,4.4],'sf_shadow'),c([x-.2,3.6,-2.3],[3.7,.9,4.6],'sf_gale')],'arm_'+side))
 for i,x in enumerate((-2,2)):
  b.append(bone(f'leg_{i}',[x,5.2,0],[c([x-1.3,.7,-1.4],[2.6,4.6,2.8],'sf_stone'),c([x-1.4,0,-1.8],[2.8,1,3.5],'sf_shadow')],'body'))
 return b

DESIGNS=[cloud_glider,wind_ring_bird,gust_ogre]
def paint(mat,w,h,seed,face,part,ci):
 im=surface(mat,w,h,seed,face,'no_generic_eye',ci);d=ImageDraw.Draw(im);base=PALETTE[mat]
 if mat in ('sf_glide_wing','sf_glide_tip','sf_bird_wing','sf_bird_feather'):
  for k in range(1,5):
   x=w*k/5;d.line([(x,0),(x-w*.05,h*.48),(x,h)],fill=(*tint(base,-22),255),width=max(1,w//75))
 if mat in ('sf_stone','sf_shadow'):
  d.line([(w*.2,h*.12),(w*.32,h*.3),(w*.27,h*.51),(w*.4,h*.75)],fill=(*tint(base,-26),255),width=max(1,w//75))
 if mat=='sf_rune':
  d.line([(w*.2,h*.55),(w*.42,h*.25),(w*.68,h*.42),(w*.5,h*.72),(w*.25,h*.65)],fill=(91,140,154,255),width=max(1,w//24))
 if part=='head' and ci==0 and face in ('west','east'):
  d.polygon([(w*.22,h*.3),(w*.66,h*.34),(w*.58,h*.5),(w*.3,h*.47)],fill=(43,68,80,255));d.polygon([(w*.3,h*.35),(w*.58,h*.38),(w*.54,h*.45),(w*.33,h*.44)],fill=(241,218,151,255))
 if part=='head' and ci==0 and face=='north':
  for x in (.3,.7):d.rectangle((w*(x-.08),h*.32,w*(x+.08),h*.46),fill=(238,224,167,255))
 return im

def material(mat):return (0,0,190,255)
def build(i):return bake(f'foe_6_{i}',f'f6_{i}_',DESIGNS[i](),paint,material)
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 for i in range(len(DESIGNS)):
  for path,data in build(i).items():
   if a.write:path.write_bytes(data)
   elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Sky foe art stale: '+str(path))
 print(f'{len(DESIGNS)} sky foe prototypes: {len(DESIGNS)*4} files '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
