#!/usr/bin/env python3
"""Nine individually designed sky-island enemy studies (indices 3..11).

Geometry is authored per creature; helper functions build jointed limbs, not
shared whole-animal rigs. Procedural atlases and motion remain provisional.
"""
import argparse
from PIL import ImageDraw
from build_forest_wild_art import c,bone,bake,PALETTE,surface,tint
from refine_mob_anatomy import refine_baked
PALETTE.update({
 'sky_rock':(132,152,157),'sky_dark':(72,102,114),'sky_edge':(180,192,185),'sky_gold':(221,192,131),'sky_cloud':(224,233,222),
 'sky_shell':(149,181,181),'sky_pale':(200,224,216),'sky_fur':(130,160,168),'sky_mane':(193,212,205),'sky_feather':(215,229,219),
 'sky_wing':(109,156,174),'sky_wingtip':(172,203,204),'sky_spore':(190,210,173),'sky_web':(180,207,204),
 'sky_noble':(102,139,155),'sky_noble_edge':(180,207,207),'sky_shadow':(87,113,131),'sky_sentinel':(154,170,169),'sky_haze':(185,211,205),
})

def segment_legs(b,n,half,spread,zs,y):
 for i in range(n):
  sign=-1 if i%2==0 else 1;z=zs[i//2];inner=half-.2;x=-spread if sign<0 else inner;tip=-spread-.4 if sign<0 else spread-.4
  b.append(bone(f'leg_{i}',[sign*inner,y,z],[c([x,y-.45,z-.45],[spread-inner,.9,.9],'sky_dark')],'body'))
  b.append(bone(f'foot_{i}',[sign*(spread-.3),y,z],[c([tip,.5,z-.45],[.8,y,.9],'sky_dark'),c([tip-.2,0,z-.8],[1.2,.7,1.6],'sky_edge')],f'leg_{i}'))

def feet(b,positions,height,fur='sky_fur',paw='sky_dark',wide=1.2):
 for i,(x,z) in enumerate(positions):
  b.append(bone(f'leg_{i}',[x,height-.2,z],[c([x-wide/2,.5,z-.55],[wide,height,1.1],fur),c([x-wide/2-.1,0,z-1],[wide+.2,.7,1.8],paw)],'body'))

def floating_shell():
 # Armoured six-legged shell with separate layered floating-stone slabs.
 b=[bone('body',[0,4,0],[c([-3.1,2,-3],[6.2,3.5,8],'sky_dark'),c([-3.5,5.2,-2.8],[7,1.1,7.6],'sky_rock')]),
    bone('head',[0,4,-3],[c([-2.2,2.5,-5.5],[4.4,2.8,2.8],'sky_shadow'),c([-.8,2.8,-6.8],[1.6,1.2,1.5],'sky_gold')],'body'),
    bone('shell_l',[-.2,6,0],[c([-3.5,6,-2.5],[3.5,1.2,6.9],'sky_shell'),c([-3.2,7,-1.9],[2.9,.8,5.5],'sky_edge')],'body'),
    bone('shell_r',[.2,6,0],[c([0,6,-2.5],[3.5,1.2,6.9],'sky_shell'),c([.3,7,-1.9],[2.9,.8,5.5],'sky_edge')],'body'),
    bone('keystone',[0,7,1],[c([-1.7,7.5,0],[3.4,1.2,2.6],'sky_rock'),c([-.9,8.5,.6],[1.8,1,1.4],'sky_cloud')],'body')]
 segment_legs(b,6,3.1,5.3,[-1.7,.4,2.7],2.8)
 return b

def ring_shadow():
 # Cat-like low hunter with independently linked, split fan tail.
 b=[bone('body',[0,6,0],[c([-2.4,4,-3.2],[4.8,4.1,8.2],'sky_shadow'),c([-2.8,6.6,-2.8],[5.6,1.7,3.5],'sky_mane')]),
    bone('head',[0,7,-2.9],[c([-1.9,6,-6.2],[3.8,3,3.7],'sky_dark'),c([-.9,6,-7.7],[1.8,1.2,1.8],'sky_shadow'),c([-1.7,8.7,-5.5],[.9,1.7,1],'sky_mane'),c([.8,8.7,-5.5],[.9,1.7,1],'sky_mane')],'body'),
    bone('tail',[0,6.5,4.7],[c([-.7,5.8,4.6],[1.4,1.4,3.1],'sky_shadow')],'body'),
    bone('tail_tip',[0,6.5,7.5],[c([-1.7,5.6,7.4],[3.4,1.4,3],'sky_wing'),c([-2,5.4,9.8],[4,.8,1.4],'sky_pale')],'tail'),
    bone('wind_mark',[0,8,0],[c([-2.4,7.8,-.1],[4.8,.7,.8],'sky_gold'),c([-2.4,8.4,-.1],[.7,2.6,.8],'sky_gold'),c([1.7,8.4,-.1],[.7,2.6,.8],'sky_gold'),c([-2.4,10.7,-.1],[4.8,.6,.8],'sky_cloud')],'body')]
 feet(b,[(-1.7,-2),(1.7,-2),(-1.7,3.7),(1.7,3.7)],4.2,'sky_shadow')
 return b

def spore_bird():
 # Spread feather wings and mushroom cluster: different posture from ring bird.
 b=[bone('body',[0,5.5,0],[c([-2.2,3,-2.7],[4.4,4.4,6.2],'sky_pale'),c([-1.7,2.8,2],[3.4,1,2.8],'sky_spore')]),
    bone('head',[0,6.7,-2.5],[c([-1.7,5.8,-5.3],[3.4,3,3.2],'sky_mane'),c([-.6,6,-6.7],[1.2,.9,1.7],'sky_gold')],'body'),
    bone('mushroom',[0,7.3,.7],[c([-.7,7.2,.1],[1.4,1.3,1.3],'sky_pale'),c([-1.9,8.3,-.8],[3.8,.8,3],'sky_spore'),c([-1.2,9,-.2],[2.4,.5,1.8],'sky_cloud')],'body'),
    bone('tail',[0,4.8,3],[c([-1.6,4.5,3],[3.2,.7,3],'sky_wing'),c([-2.1,4.3,5.5],[4.2,.6,1.5],'sky_feather')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-6.2 if sign<0 else 2;tip=-9.5 if sign<0 else 5.7
  b.append(bone('wing_'+side,[sign*2,6.3,0],[c([x,5.9,-1.9],[4.2,.8,5.1],'sky_wing'),c([x,5.6,2.5],[4.2,.5,1.4],'sky_spore')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*5.7,6.3,0],[c([tip,5.8,-1.3],[3.8,.7,4.7],'sky_wingtip'),c([tip,5.5,2.7],[3.8,.5,1.2],'sky_feather')],'wing_'+side))
 feet(b,[(-1,.4),(1,.4)],3,'sky_dark','sky_gold',.7)
 return b

def sky_web_spider():
 # Long eight-leg web guardian with raised silk-frame on the abdomen.
 b=[bone('body',[0,4,0],[c([-2.8,2.5,-2.4],[5.6,3.3,5.4],'sky_dark'),c([-3.4,2.3,2.5],[6.8,3.8,5.2],'sky_shadow')]),
    bone('head',[0,4,-2],[c([-2.1,2.5,-5.2],[4.2,2.8,3],'sky_fur'),c([-1.7,1.8,-5.7],[.9,1.2,1.1],'sky_cloud'),c([.8,1.8,-5.7],[.9,1.2,1.1],'sky_cloud')],'body'),
    bone('web_frame',[0,6,4],[c([-2.8,5.9,2.7],[5.6,.5,4.1],'sky_web'),c([-2.2,6.3,2.9],[.6,1.5,.6],'sky_pale'),c([1.6,6.3,2.9],[.6,1.5,.6],'sky_pale'),c([-2.2,7.5,2.9],[4.4,.5,.6],'sky_web')],'body'),
    bone('spinner',[0,4,7],[c([-.9,3.3,7],[1.8,1.3,2],'sky_web')],'body')]
 segment_legs(b,8,2.8,6.2,[-1.6,.1,2,4],3.2)
 return b

def wind_hare():
 # Long swept ears, fan tail and asymmetric wind pennant.
 b=[bone('body',[0,4,0],[c([-2.5,2,-2.6],[5,4.1,6.7],'sky_fur'),c([-2.1,1.7,-1.8],[4.2,.7,5.2],'sky_pale')]),
    bone('head',[0,5.8,-2.5],[c([-1.9,4.5,-5.5],[3.8,3.4,3.5],'sky_fur'),c([-.8,4.5,-6.5],[1.6,1,1.3],'sky_cloud')],'body'),
    bone('tail',[0,4,3.9],[c([-.9,3.6,3.8],[1.8,1.5,1.8],'sky_cloud'),c([-1.4,3.6,5.1],[2.8,.7,1.6],'sky_wingtip')],'body'),
    bone('pennant',[0,6,0],[c([-1,6,-1],[2,.7,2.5],'sky_gold'),c([-.3,6.6,-.2],[.6,1.9,.6],'sky_edge'),c([-.3,7.9,-.2],[2,.6,1.7],'sky_cloud')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-1.7 if sign<0 else .6
  b.append(bone('ear_'+side,[sign*1.1,7.5,-4],[c([x,7.4,-4.8],[1.1,4.8,1.4],'sky_fur'),c([x+.2,8,-5],[.7,3.4,.3],'sky_pale')],'head'))
 feet(b,[(-1.5,-1.2),(1.5,-1.2),(-1.7,2.8),(1.7,2.8)],2.6)
 return b

def wing_noble():
 # A winged upright noble, distinct from the two conventional bird forms.
 # Existing bird gameplay/collision remains untouched until later review.
 b=[bone('body',[0,8,0],[c([-3,4,-2],[6,6.4,4],'sky_noble'),c([-3.4,8.6,-2.4],[6.8,1.6,4.8],'sky_noble_edge'),c([-.9,5.4,-2.5],[1.8,2,.7],'sky_gold')]),
    bone('head',[0,10.4,0],[c([-2,10,-2],[4,3.5,3.6],'sky_dark'),c([-2.2,13.2,-1.8],[4.4,.8,3.2],'sky_gold'),c([-.7,13.9,-1.4],[1.4,1.4,1.2],'sky_cloud')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-4.8 if sign<0 else 2.8;wx=-7.4 if sign<0 else 2.8;tip=-10.5 if sign<0 else 6.8
  b.append(bone('arm_'+side,[sign*2.8,9,0],[c([x,4.6,-1.4],[2,4.6,2.8],'sky_noble'),c([x-.1,4.4,-1.5],[2.2,1,3],'sky_gold')],'body'))
  b.append(bone('wing_'+side,[sign*2.8,9,1],[c([wx,8.4,.4],[4.6,.8,4.5],'sky_wing'),c([wx,8.2,4],[4.6,.5,1.4],'sky_noble_edge')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*6.8,8.7,1],[c([tip,8.3,1],[3.7,.7,4.3],'sky_wingtip'),c([tip,8.1,4.5],[3.7,.5,1.2],'sky_feather')],'wing_'+side))
 feet(b,[(-1.6,0),(1.6,0)],4.2,'sky_noble','sky_gold',1.9)
 return b

def wind_stalker():
 # Long, low four-legged hunter with forward crest and three-segment tail.
 b=[bone('body',[0,6,0],[c([-2.1,4.1,-3.6],[4.2,3.8,9.4],'sky_fur'),c([-2.4,6.6,-3.4],[4.8,1.5,3],'sky_wing')]),
    bone('head',[0,7,-3.4],[c([-1.8,5.8,-6.9],[3.6,3,3.8],'sky_shadow'),c([-.8,5.8,-8.8],[1.6,1.1,2.2],'sky_dark'),c([-1.5,8.4,-6.1],[.9,1.8,1],'sky_gold'),c([.6,8.4,-6.1],[.9,1.8,1],'sky_gold')],'body'),
    bone('tail',[0,6,5.5],[c([-.7,5.3,5.3],[1.4,1.4,3],'sky_fur')],'body'),
    bone('tail_mid',[0,6,8],[c([-.6,5.4,7.9],[1.2,1.3,3],'sky_wing')],'tail'),
    bone('tail_tip',[0,6,10.4],[c([-1.2,5.1,10.3],[2.4,1.8,2.6],'sky_pale')],'tail_mid'),
    bone('crest',[0,8,-.8],[c([-.8,7.8,-2],[1.6,1,3.3],'sky_gold'),c([-.4,8.6,-1.4],[.8,1.3,1.4],'sky_cloud')],'body')]
 feet(b,[(-1.5,-2.1),(1.5,-2.1),(-1.5,4.3),(1.5,4.3)],4.3,'sky_fur','sky_dark',1.1)
 return b

def floating_sentinel():
 # Wall-like stone guardian with shield and stepped crenellated helmet.
 b=[bone('body',[0,10,0],[c([-4.3,5,-2.6],[8.6,8.5,5.2],'sky_sentinel'),c([-4.6,11,-3],[9.2,2.2,6],'sky_edge')]),
    bone('shield',[0,8,-2.7],[c([-3.1,6,-3.3],[6.2,4.3,.9],'sky_dark'),c([-2.6,6.4,-3.8],[5.2,3.5,.7],'sky_shell'),c([-.7,7.4,-4.1],[1.4,1.5,.5],'sky_gold')],'body'),
    bone('head',[0,13.8,0],[c([-2.8,13.1,-2.4],[5.6,4.1,4.5],'sky_shadow'),c([-3.1,16.9,-2.1],[6.2,1,4.1],'sky_edge')],'body'),
    bone('battlement',[0,17,0],[c([-2.7,17.7,-1.6],[5.4,.5,1.2],'sky_gold'),c([-2.7,18,-1.6],[1,1.2,1.2],'sky_cloud'),c([-.5,18,-1.6],[1,1.6,1.2],'sky_cloud'),c([1.7,18,-1.6],[1,1.2,1.2],'sky_cloud')],'head')]
 for side,sign in [('l',-1),('r',1)]:
  x=-7.3 if sign<0 else 4.2
  b.append(bone('arm_'+side,[sign*4.2,12.5,0],[c([x,6.8,-1.9],[3.1,5.9,3.8],'sky_sentinel')],'body'))
  b.append(bone('fist_'+side,[sign*5.6,7,0],[c([x-.1,4.1,-2.1],[3.3,2.9,4.2],'sky_shadow')],'arm_'+side))
 feet(b,[(-2,0),(2,0)],5.2,'sky_sentinel','sky_shadow',2.6)
 return b

def tornado_beast():
 # Small four-legged animal with a tiered spiral-tail fin, not another hare.
 b=[bone('body',[0,4,0],[c([-2.3,2,-2.7],[4.6,4,6.5],'sky_fur'),c([-2.4,5,-2.5],[4.8,1.1,2.7],'sky_haze')]),
    bone('head',[0,5.5,-2.4],[c([-1.8,4.5,-5.5],[3.6,3.2,3.6],'sky_fur'),c([-.8,4.5,-6.6],[1.6,1.1,1.4],'sky_dark'),c([-1.6,7.4,-4.8],[1,1.4,1.1],'sky_pale'),c([.6,7.4,-4.8],[1,1.4,1.1],'sky_pale')],'body'),
    bone('tail',[0,4.5,3.6],[c([-.7,3.8,3.5],[1.4,1.4,2.6],'sky_fur')],'body'),
    bone('vortex',[0,4.6,5.8],[c([-1.1,3.6,5.6],[2.2,2.1,2.3],'sky_wingtip'),c([-2,4.3,6.5],[4,1,2.5],'sky_cloud'),c([-1.4,5.2,6.9],[2.8,.9,1.8],'sky_haze'),c([-.7,6,7.1],[1.4,.8,1.3],'sky_cloud')],'tail')]
 feet(b,[(-1.4,-1.3),(1.4,-1.3),(-1.5,2.6),(1.5,2.6)],2.5)
 return b

DESIGNS=[floating_shell,ring_shadow,spore_bird,sky_web_spider,wind_hare,wing_noble,wind_stalker,floating_sentinel,tornado_beast]
def paint(mat,w,h,seed,face,part,ci):
 im=surface(mat,w,h,seed,face,'no_generic_eye',ci);d=ImageDraw.Draw(im);base=PALETTE[mat]
 if mat in ('sky_rock','sky_shell','sky_sentinel'):
  for k in (1,2,3):
   x=w*k/4;d.line([(x,0),(x-w*.06,h*.3),(x+w*.03,h*.57),(x,h)],fill=(*tint(base,-23),255),width=max(1,w//75))
 if mat in ('sky_wing','sky_wingtip','sky_feather','sky_noble_edge'):
  for k in (1,2,3,4):
   x=w*k/5;d.line([(x,0),(x-w*.05,h*.48),(x,h)],fill=(*tint(base,-22),255),width=max(1,w//75))
 if mat=='sky_spore':
  for x,y in ((.2,.25),(.6,.2),(.75,.65),(.35,.7)):
   r=max(1,min(w,h)*.07);d.ellipse((w*x-r,h*y-r,w*x+r,h*y+r),fill=(*tint(base,22),255))
 if mat=='sky_web':
  d.line([(w*.1,h*.15),(w*.9,h*.85)],fill=(117,157,157,255),width=max(1,w//65));d.line([(w*.9,h*.15),(w*.1,h*.85)],fill=(117,157,157,255),width=max(1,w//65))
 if part=='head' and ci==0 and face in ('west','east'):
  d.polygon([(w*.22,h*.3),(w*.66,h*.34),(w*.58,h*.5),(w*.3,h*.47)],fill=(43,68,80,255));d.polygon([(w*.3,h*.35),(w*.58,h*.38),(w*.54,h*.45),(w*.33,h*.44)],fill=(241,218,151,255))
 if part=='head' and ci==0 and face=='north':
  for x in (.3,.7):d.rectangle((w*(x-.08),h*.32,w*(x+.08),h*.46),fill=(238,224,167,255))
 return im

def build(i):
 name=f'foe_6_{i}'
 return refine_baked(name,bake(name,f'f6_{i}_',DESIGNS[i-3](),paint))
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 for i in range(3,12):
  for path,data in build(i).items():
   if a.write:path.write_bytes(data)
   elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Sky foe art stale: '+str(path))
 print('Nine additional sky foe prototypes: 36 files '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
