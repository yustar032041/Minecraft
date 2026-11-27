#!/usr/bin/env python3
"""Nine separate clockwork enemy geometry/texture studies, no behavior edits."""
import argparse
from PIL import ImageDraw
from build_forest_wild_art import c,bone,bake,PALETTE,surface,tint
from refine_mob_anatomy import refine_baked
PALETTE.update({
 'ct_steel':(110,122,126),'ct_dark':(56,66,72),'ct_brass':(179,145,97),'ct_copper':(165,110,80),'ct_cream':(213,199,162),
 'ct_shell':(137,150,147),'ct_plate':(153,163,157),'ct_joint':(72,83,87),'ct_fur':(104,118,123),'ct_mane':(156,162,153),
 'ct_wing':(103,128,138),'ct_wingtip':(165,184,179),'ct_spore':(170,181,146),'ct_glass':(182,208,203),'ct_web':(170,185,175),
 'ct_robe':(71,84,90),'ct_mask':(163,171,162),'ct_rabbit':(137,148,144),'ct_clock':(201,176,130),
})

def legs(b,n,half,spread,zs,y):
 for i in range(n):
  sign=-1 if i%2==0 else 1;z=zs[i//2];inner=half-.2;x=-spread if sign<0 else inner;tip=-spread-.4 if sign<0 else spread-.4
  b.append(bone(f'leg_{i}',[sign*inner,y,z],[c([x,y-.45,z-.45],[spread-inner,.9,.9],'ct_joint')],'body'))
  b.append(bone(f'foot_{i}',[sign*(spread-.3),y,z],[c([tip,.5,z-.45],[.8,y,.9],'ct_dark'),c([tip-.2,0,z-.8],[1.2,.7,1.6],'ct_brass')],f'leg_{i}'))

def feet(b,positions,height,mat='ct_fur',paw='ct_dark',wide=1.2):
 for i,(x,z) in enumerate(positions):
  b.append(bone(f'leg_{i}',[x,height-.2,z],[c([x-wide/2,.5,z-.55],[wide,height,1.1],mat),c([x-wide/2-.1,0,z-1],[wide+.2,.7,1.8],paw)],'body'))

def clock_shell():
 # Six-legged shell bearer, paired armour and standing seconds-hand clock.
 b=[bone('body',[0,4,0],[c([-3.2,2,-3],[6.4,3.6,8.2],'ct_dark'),c([-3.5,5.2,-2.8],[7,1.2,7.7],'ct_plate')]),
    bone('head',[0,4,-3],[c([-2.2,2.4,-5.6],[4.4,2.9,2.9],'ct_joint'),c([-.8,2.8,-6.9],[1.6,1.2,1.6],'ct_brass')],'body'),
    bone('shell_l',[-.2,6,0],[c([-3.5,6,-2.5],[3.5,1.1,7],'ct_shell'),c([-3.2,6.9,-1.8],[2.9,.7,5.6],'ct_plate')],'body'),
    bone('shell_r',[.2,6,0],[c([0,6,-2.5],[3.5,1.1,7],'ct_shell'),c([.3,6.9,-1.8],[2.9,.7,5.6],'ct_plate')],'body'),
    bone('clock',[0,7,1],[c([-1.8,7.4,.2],[3.6,2.9,1.3],'ct_brass'),c([-1.4,7.8,0],[2.8,2.1,.5],'ct_clock'),c([-.25,10,0],[.5,2.4,.6],'ct_cream')],'body')]
 legs(b,6,3.2,5.4,[-1.7,.4,2.7],2.8)
 return b

def reverse_fox():
 # Fox with broad back-swept three-joint tail and asymmetrical reverse emblem.
 b=[bone('body',[0,6,0],[c([-2.3,4,-3.2],[4.6,4.2,8.3],'ct_fur'),c([-2.7,6.6,-3],[5.4,1.6,3.1],'ct_mane')]),
    bone('head',[0,7,-2.9],[c([-1.9,6,-6.4],[3.8,3.1,3.8],'ct_fur'),c([-.9,6,-8],[1.8,1.2,1.9],'ct_dark'),c([-1.7,8.8,-5.5],[1,1.8,1],'ct_brass'),c([.7,8.8,-5.5],[1,1.8,1],'ct_brass')],'body'),
    bone('tail',[0,6.5,4.8],[c([-.8,5.7,4.7],[1.6,1.6,3.2],'ct_fur')],'body'),
    bone('tail_mid',[0,6.5,7.5],[c([-1.4,5.4,7.4],[2.8,2,3],'ct_mane')],'tail'),
    bone('tail_tip',[0,6.5,10],[c([-2.1,5.1,9.9],[4.2,2.5,2.8],'ct_plate'),c([-1.5,5.4,12.4],[3,1.9,1.1],'ct_brass')],'tail_mid'),
    bone('reverse_mark',[0,8,0],[c([-1.6,7.9,-1],[3.2,.6,2.4],'ct_brass'),c([-.9,8.4,-.4],[1.8,.5,1.4],'ct_clock')],'body')]
 feet(b,[(-1.6,-1.9),(1.6,-1.9),(-1.6,3.8),(1.6,3.8)],4.2)
 return b

def station_spore_bird():
 # Clockwork moth/bird with split spread wings, spore receptacle and short beak.
 b=[bone('body',[0,5.5,0],[c([-2.1,3,-2.6],[4.2,4.6,5.5],'ct_dark'),c([-1.5,2.8,2],[3,1.8,2.6],'ct_spore')]),
    bone('head',[0,7,-2],[c([-1.7,6.2,-5],[3.4,3.1,3.2],'ct_plate'),c([-.6,6.4,-6.5],[1.2,1,1.8],'ct_brass')],'body'),
    bone('spore_vessel',[0,7.5,.3],[c([-1,7.4,-.4],[2,1.5,2.4],'ct_spore'),c([-1.5,8.7,-.8],[3,.7,3.2],'ct_brass')],'body'),
    bone('tail',[0,4.6,2.5],[c([-1.8,4.3,2.4],[3.6,.7,3],'ct_wing'),c([-2.2,4.1,4.8],[4.4,.6,1.6],'ct_wingtip')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-6 if sign<0 else 1.9;tip=-9.2 if sign<0 else 5.5
  b.append(bone('wing_'+side,[sign*1.9,6.4,0],[c([x,6,-2],[4.1,.8,5.1],'ct_wing'),c([x,5.7,2.3],[4.1,.5,1.5],'ct_spore')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*5.5,6.3,0],[c([tip,5.9,-1.4],[3.7,.7,4.7],'ct_wingtip'),c([tip,5.6,2.6],[3.7,.5,1.3],'ct_brass')],'wing_'+side))
 feet(b,[(-1,.4),(1,.4)],3,'ct_dark','ct_brass',.7)
 return b

def time_spider():
 # Silk shuttle on abdomen; long segmented metal legs and forward mandibles.
 b=[bone('body',[0,4,0],[c([-2.8,2.4,-2.3],[5.6,3.3,5.4],'ct_dark'),c([-3.4,2.2,2.5],[6.8,3.8,5.4],'ct_shell')]),
    bone('head',[0,4,-2],[c([-2.1,2.4,-5.3],[4.2,2.9,3.2],'ct_joint'),c([-1.7,1.8,-5.7],[.9,1.2,1.1],'ct_brass'),c([.8,1.8,-5.7],[.9,1.2,1.1],'ct_brass')],'body'),
    bone('shuttle',[0,6,4],[c([-2.6,5.9,2.8],[5.2,.7,3.7],'ct_web'),c([-1,6.5,3.4],[2,1.2,2.6],'ct_brass'),c([-.4,7.5,4],[.8,1,1.2],'ct_clock')],'body'),
    bone('spinner',[0,4,7],[c([-.9,3.2,7],[1.8,1.4,2],'ct_web')],'body')]
 legs(b,8,2.8,6,[-1.6,.1,2,4],3.1)
 return b

def stop_hare():
 # Station-stop hare with a rectangular marker plate and short fan tail.
 b=[bone('body',[0,4,0],[c([-2.5,2,-2.6],[5,4.1,6.7],'ct_rabbit'),c([-2.1,1.7,-1.8],[4.2,.7,5.2],'ct_cream')]),
    bone('head',[0,5.8,-2.5],[c([-1.9,4.5,-5.5],[3.8,3.4,3.5],'ct_rabbit'),c([-.8,4.5,-6.5],[1.6,1,1.3],'ct_cream')],'body'),
    bone('tail',[0,4,3.9],[c([-.9,3.6,3.8],[1.8,1.5,1.8],'ct_cream')],'body'),
    bone('stop_marker',[0,6,0],[c([-1.5,6,-1],[3,.7,2.5],'ct_brass'),c([-.35,6.6,-.2],[.7,1.8,.7],'ct_dark'),c([-.9,8,-.5],[1.8,1.3,1.3],'ct_plate')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-1.7 if sign<0 else .6
  b.append(bone('ear_'+side,[sign*1.1,7.5,-4],[c([x,7.4,-4.8],[1.1,4.7,1.4],'ct_rabbit'),c([x+.2,8,-5],[.7,3.2,.3],'ct_brass')],'head'))
 feet(b,[(-1.5,-1.2),(1.5,-1.2),(-1.7,2.8),(1.7,2.8)],2.6,'ct_rabbit')
 return b

def faceless_guard():
 # Smooth unmarked mask, long coat panels and a shield with clock divisions.
 b=[bone('body',[0,9,0],[c([-3.6,4,-2.3],[7.2,7,4.6],'ct_robe'),c([-3.9,8.5,-2.6],[7.8,2,5.2],'ct_plate'),c([-3.2,2.8,-2],[6.4,1.4,4],'ct_robe')]),
    bone('shield',[0,7,-2.3],[c([-2.6,5.2,-3],[5.2,3.8,.9],'ct_dark'),c([-2.1,5.6,-3.4],[4.2,3,.6],'ct_brass'),c([-.7,6.3,-3.7],[1.4,1.4,.5],'ct_clock')],'body'),
    bone('head',[0,11,0],[c([-2.4,10.5,-2],[4.8,3.7,3.8],'ct_mask'),c([-2.6,13.9,-1.8],[5.2,.8,3.5],'ct_dark')],'body'),
    bone('halo',[0,14,1],[c([-2,14.5,.6],[4,.6,1],'ct_brass'),c([-.5,15,.6],[1,1.3,1],'ct_clock')],'head')]
 for side,sign in [('l',-1),('r',1)]:
  x=-5.8 if sign<0 else 3.5
  b.append(bone('arm_'+side,[sign*3.5,10,0],[c([x,5,-1.5],[2.3,5.2,3],'ct_robe'),c([x-.1,4.8,-1.6],[2.5,1,3.2],'ct_brass')],'body'))
  b.append(bone('hand_'+side,[sign*4.6,5,0],[c([x+.2,3.7,-1.3],[1.9,1.4,2.6],'ct_dark')],'arm_'+side))
 feet(b,[(-1.7,0),(1.7,0)],4.1,'ct_dark','ct_plate',2)
 return b

def hourglass_hare():
 # Long-limbed hunter hare with articulated hocks, oversized hind thighs and
 # tall hourglass; purposefully differs from the compact stop-line rabbit.
 b=[bone('body',[0,5.2,0],[c([-2.1,3,-3],[4.2,3.7,7.5],'ct_rabbit'),c([-1.9,2.7,-2.1],[3.8,.7,5.7],'ct_cream')]),
    bone('head',[0,7,-2.8],[c([-1.7,5.8,-6],[3.4,3.1,3.5],'ct_rabbit'),c([-.8,5.8,-7],[1.6,1,1.3],'ct_dark')],'body'),
    bone('tail',[0,5.2,4.2],[c([-.8,4.4,4.1],[1.6,1.6,1.6],'ct_cream')],'body'),
    bone('hourglass',[0,6.8,.5],[c([-1.4,6.5,-.6],[2.8,.6,2.4],'ct_brass'),c([-1.1,7,-.4],[2.2,1.3,2],'ct_glass'),c([-.6,8.1,0],[1.2,.8,1.2],'ct_clock'),c([-1.1,8.7,-.4],[2.2,1.3,2],'ct_glass'),c([-1.4,9.8,-.6],[2.8,.6,2.4],'ct_brass')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-1.5 if sign<0 else .6
  b.append(bone('ear_'+side,[sign*1,8.5,-4],[c([x,8.5,-5],[.9,5.3,1.3],'ct_rabbit'),c([x+.15,9,-5.2],[.6,4,.3],'ct_clock')],'head'))
 for i,(x,z) in enumerate([(-1.3,-1.4),(1.3,-1.4),(-1.65,3.1),(1.65,3.1)]):
  wide=1.0 if i<2 else 2.0
  b.append(bone(f'leg_{i}',[x,3.3,z],[c([x-wide/2,1.9,z-.6],[wide,1.6,1.2],'ct_rabbit')],'body'))
  b.append(bone(f'hock_{i}',[x,2,z],[c([x-.45,.5,z-.5],[.9,1.6,1],'ct_joint'),c([x-wide/2,0,z-1.1],[wide,.7,1.9],'ct_dark')],f'leg_{i}'))
 return b

def steel_clock_beast():
 # Heavy, broad-shouldered mechanical beast with tusks, articulated pistons
 # and a raised hour hand. Its form is intentionally unlike the slim steel dog.
 b=[bone('body',[0,7.5,0],[c([-4,3.9,-3.8],[8,5.8,9.5],'ct_steel'),c([-4.5,7.8,-3.5],[9,2.6,4.2],'ct_plate'),c([-3.4,9.4,-2.5],[6.8,1.3,6.8],'ct_shell')]),
    bone('head',[0,8,-3.4],[c([-2.8,5.7,-7.3],[5.6,4.2,4.1],'ct_dark'),c([-2,5.2,-9.1],[4,1.8,2.1],'ct_joint'),c([-2.6,9.5,-6.7],[1.4,2.2,1.3],'ct_brass'),c([1.2,9.5,-6.7],[1.4,2.2,1.3],'ct_brass')],'body'),
    bone('clock_hand',[0,10,1],[c([-2.1,10.4,-.5],[4.2,.8,3.2],'ct_brass'),c([-.4,11,-.3],[.8,2.8,.8],'ct_clock')],'body'),
    bone('tail',[0,7,5.4],[c([-.9,6.2,5.3],[1.8,1.8,2.4],'ct_dark'),c([-1.4,5.9,7.2],[2.8,2.4,1.4],'ct_copper')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-3.2 if sign<0 else 2.3
  b.append(bone('tusk_'+side,[sign*2.5,6,-7],[c([x,4.8,-8.5],[.9,2.4,1.8],'ct_brass'),c([x,4.6,-9.3],[.9,.8,1.3],'ct_cream')],'head'))
 for i,(x,z) in enumerate([(-2.8,-2.2),(2.8,-2.2),(-2.8,4),(2.8,4)]):
  b.append(bone(f'leg_{i}',[x,4.3,z],[c([x-1.05,2.1,z-.8],[2.1,2.5,1.6],'ct_steel')],'body'))
  b.append(bone(f'piston_{i}',[x,2.2,z],[c([x-.75,.5,z-.65],[1.5,1.9,1.3],'ct_joint'),c([x-1.15,0,z-1.15],[2.3,.8,2.1],'ct_brass')],f'leg_{i}'))
 return b

def reverse_mist_bird():
 # Upright bird with swept-back folded wings, tall mist tail and reversal crest.
 b=[bone('body',[0,5.5,0],[c([-2.4,2.7,-2.4],[4.8,5.6,5.6],'ct_wing'),c([-2,3,-2.8],[4,4,.6],'ct_wingtip')]),
    bone('head',[0,8,-2],[c([-1.9,7.7,-4.6],[3.8,3.3,3.6],'ct_plate'),c([-.6,8,-6],[1.2,1,1.8],'ct_brass'),c([-.5,10.7,-3.6],[1,1.9,1.2],'ct_glass')],'body'),
    bone('tail',[0,4,3],[c([-1.8,3.7,2.8],[3.6,.8,3],'ct_wing'),c([-2.4,3.5,5.1],[4.8,.6,2],'ct_glass')],'body'),
    bone('clock_crest',[0,8,1],[c([-1.6,8.1,.1],[3.2,.7,2.6],'ct_brass'),c([-.7,8.7,.7],[1.4,1.5,1.4],'ct_clock')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-3.9 if sign<0 else 2.3;tip=-4 if sign<0 else 2.5
  b.append(bone('wing_'+side,[sign*2.3,7,0],[c([x,3.8,-1.7],[1.6,3.5,4.2],'ct_wing')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*3.1,4.4,0],[c([tip,2.7,-1],[1.5,1.6,3.5],'ct_glass')],'wing_'+side))
 feet(b,[(-1.1,.4),(1.1,.4)],2.8,'ct_dark','ct_brass',.8)
 return b

DESIGNS=[clock_shell,reverse_fox,station_spore_bird,time_spider,stop_hare,faceless_guard,hourglass_hare,steel_clock_beast,reverse_mist_bird]
def paint(mat,w,h,seed,face,part,ci):
 im=surface(mat,w,h,seed,face,'no_generic_eye',ci);d=ImageDraw.Draw(im);base=PALETTE[mat]
 if mat in ('ct_steel','ct_shell','ct_plate','ct_brass','ct_copper'):
  for x in (.15,.85):
   for y in (.18,.82):
    r=max(1,min(w,h)//35);d.ellipse((w*x-r,h*y-r,w*x+r,h*y+r),fill=(*tint(base,25),255))
  d.line((w*.1,h*.13,w*.9,h*.13),fill=(*tint(base,-25),255),width=max(1,w//80))
 if mat in ('ct_wing','ct_wingtip'):
  for k in (1,2,3,4):
   x=w*k/5;d.line([(x,0),(x-w*.05,h*.48),(x,h)],fill=(*tint(base,-22),255),width=max(1,w//75))
 if mat=='ct_clock':
  d.ellipse((w*.18,h*.14,w*.82,h*.86),outline=(83,72,62,255),width=max(1,w//25));d.line([(w*.5,h*.22),(w*.5,h*.5),(w*.7,h*.65)],fill=(72,66,63,255),width=max(1,w//24))
 if mat=='ct_web':
  d.line([(w*.1,h*.15),(w*.9,h*.85)],fill=(100,121,117,255),width=max(1,w//65));d.line([(w*.9,h*.15),(w*.1,h*.85)],fill=(100,121,117,255),width=max(1,w//65))
 # A faceless guard deliberately has no painted eye on any side of its mask.
 if part=='head' and ci==0 and mat!='ct_mask' and face in ('west','east'):
  d.polygon([(w*.22,h*.3),(w*.66,h*.34),(w*.58,h*.5),(w*.3,h*.47)],fill=(31,39,43,255));d.polygon([(w*.3,h*.35),(w*.58,h*.38),(w*.54,h*.45),(w*.33,h*.44)],fill=(236,203,136,255))
 if part=='head' and ci==0 and mat!='ct_mask' and face=='north':
  for x in (.3,.7):d.rectangle((w*(x-.08),h*.32,w*(x+.08),h*.46),fill=(231,195,125,255))
 return im

def material(mat):return (130,0,160,255) if mat in ('ct_steel','ct_shell','ct_plate','ct_brass','ct_copper') else (0,0,190,255)
def build(i):
 name=f'foe_7_{i}'
 return refine_baked(name,bake(name,f'f7_{i}_',DESIGNS[i-3](),paint,material))
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 for i in range(3,12):
  for path,data in build(i).items():
   if a.write:path.write_bytes(data)
   elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Clockwork foe art stale: '+str(path))
 print('Nine additional clockwork foe prototypes: 36 files '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
