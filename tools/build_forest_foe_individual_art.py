#!/usr/bin/env python3
"""Three explicitly designed forest foe prototypes (foe_1_0..2).

A shadow fox, spore-wing sentinel and horned bridge guardian have separately
authored rigs and procedural surface studies. No combat or behavior edits.
"""
import argparse
from PIL import ImageDraw
from build_forest_wild_art import c,bone,bake,PALETTE,surface,tint
PALETTE.update({
 'shade_fox_fur':(54,67,72),'shade_fox_ruff':(101,119,119),'shade_fox_muzzle':(149,165,156),'shade_fox_dark':(35,44,52),'shade_fox_tail':(72,91,94),'shade_fox_tip':(154,186,178),
 'spore_body':(73,105,86),'spore_head':(102,132,102),'spore_cap':(153,123,158),'spore_edge':(205,178,193),'spore_feather':(144,172,141),'spore_leg':(69,79,62),
 'bridge_bark':(61,70,59),'bridge_moss':(92,123,78),'bridge_wood':(113,100,74),'bridge_dark':(39,51,48),'bridge_lantern':(181,197,135),
})

def fox():
 b=[bone('body',[0,5,0],[c([-2.5,3.8,-3],[5,4,7.7],'shade_fox_fur'),c([-2,3.5,-2],[4,.6,5.4],'shade_fox_muzzle')]),
    bone('head',[0,6,-2.5],[c([-2,5,-5.8],[4,3.5,3.7],'shade_fox_fur'),c([-1.1,5,-7.2],[2.2,1.3,1.6],'shade_fox_muzzle'),c([-1.9,8.2,-5.2],[1.1,1.7,1.1],'shade_fox_dark'),c([.8,8.2,-5.2],[1.1,1.7,1.1],'shade_fox_dark')],'body'),
    bone('ruff',[0,6,-2.5],[c([-2.7,4.4,-3.1],[5.4,3,1.5],'shade_fox_ruff')],'body'),
    bone('tail',[0,6,4.3],[c([-1.4,4.8,4.2],[2.8,2.8,3],'shade_fox_tail')],'body'),
    bone('tail_fan',[0,6,6.9],[c([-2.2,4.2,6.8],[4.4,3.6,3.3],'shade_fox_tail'),c([-2,4.4,9.7],[4,3.2,1.6],'shade_fox_tip')],'tail')]
 for i,(x,z) in enumerate([(-1.7,-1.8),(1.7,-1.8),(-1.7,3.1),(1.7,3.1)]):
  b.append(bone('leg_'+str(i),[x,4.2,z],[c([x-.6,.7,z-.6],[1.2,3.6,1.2],'shade_fox_fur'),c([x-.7,0,z-.9],[1.4,.9,1.6],'shade_fox_dark')],'body'))
 return b

def spore_sentinel():
 # A short moth-like sentinel with mushroom crown and hinged paired wings.
 b=[bone('body',[0,5,0],[c([-2.1,3,-2.4],[4.2,4.6,5.6],'spore_body'),c([-2.4,6.9,-1.7],[4.8,1,4.5],'spore_cap')]),
    bone('head',[0,6,-2],[c([-1.8,5.2,-4.5],[3.6,3.1,3],'spore_head'),c([-2.2,8,-4],[4.4,.9,3.2],'spore_cap'),c([-1.6,8.8,-3.5],[3.2,.5,2.2],'spore_edge')],'body'),
    bone('tail',[0,5,3],[c([-1.4,4.3,3],[2.8,1.3,2.5],'spore_body')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=-5.9 if sign<0 else 1.9;tip=-9 if sign<0 else 5.5
  b.append(bone('wing_'+side,[sign*1.9,6,0],[c([x,5.3,-2],[4,1,4.8],'spore_cap'),c([x,5,2.2],[4,.6,1.1],'spore_edge')],'body'))
  b.append(bone('wing_'+side+'_tip',[sign*5.5,5.8,0],[c([tip,5.2,-1.4],[3.5,.8,4.4],'spore_feather'),c([tip,5,2.5],[3.2,.5,1.1],'spore_edge')],'wing_'+side))
 for i,x in enumerate((-1,1)):
  b.append(bone('leg_'+str(i),[x,3.2,.3],[c([x-.4,.4,0],[.8,2.8,.8],'spore_leg'),c([x-.6,0,-.7],[1.2,.6,1.7],'spore_leg')],'body'))
 return b

def bridge_guard():
 b=[bone('body',[0,10,0],[c([-4.3,6,-2.8],[8.6,8.4,5.6],'bridge_bark'),c([-3.7,12.5,-3.4],[7.4,1.7,.8],'bridge_wood'),c([-4.1,13.8,-2],[8.2,.9,4],'bridge_moss')]),
    bone('head',[0,14,0],[c([-3,13.8,-3],[6,4.5,5],'bridge_bark'),c([-2.4,17.8,-2.5],[4.8,1,3.8],'bridge_moss')],'body'),
    bone('lantern',[0,9,-3],[c([-1.3,8,-3.6],[2.6,2.5,.9],'bridge_dark'),c([-.8,8.4,-4],[1.6,1.6,.6],'bridge_lantern')],'body')]
 for side,sign in [('l',-1),('r',1)]:
  x=sign*1.8;out=-3.8 if sign<0 else 1.4
  b.append(bone('horn_'+side,[x,17.8,-1.5],[c([x-.5,17.6,-2],[1,2.4,1.2],'bridge_wood'),c([out,19.2,-2],[2.4,.8,1.2],'bridge_wood'),c([-3.8 if sign<0 else 3,19.2,-2],[.8,1.3,1.2],'bridge_wood')],'head'))
  ox=-7.2 if sign<0 else 4.1
  b.append(bone('arm_'+side,[sign*4.2,13,0],[c([ox,7.4,-2],[3.1,6,4],'bridge_bark'),c([ox-.15,11,-2.3],[3.4,2.2,4.6],'bridge_moss')],'body'))
  b.append(bone('forearm_'+side,[sign*5.6,7.5,0],[c([ox,4.1,-2.2],[3.1,3.6,4.4],'bridge_wood'),c([ox-.15,4,-2.4],[3.4,1.1,4.8],'bridge_dark')],'arm_'+side))
 for i,x in enumerate((-2.2,2.2)):
  b.append(bone('leg_'+str(i),[x,7,0],[c([x-1.4,1,-1.6],[2.8,6,3.2],'bridge_bark'),c([x-1.6,0,-2],[3.2,1.4,4],'bridge_dark')],'body'))
 return b
DESIGNS=[fox,spore_sentinel,bridge_guard]

def paint(mat,w,h,seed,face,part,ci):
 part_base='no_generic_eye' if mat in ('bridge_bark','shade_fox_fur') else part
 image=surface(mat,w,h,seed,face,part_base,ci);d=ImageDraw.Draw(image);base=PALETTE[mat]
 if mat=='shade_fox_fur' and part=='head' and ci==0 and face in ('west','east'):
  d.polygon([(w*.24,h*.3),(w*.64,h*.35),(w*.58,h*.48),(w*.3,h*.47)],fill=(25,36,42,255))
  d.polygon([(w*.3,h*.35),(w*.58,h*.38),(w*.53,h*.44),(w*.34,h*.44)],fill=(171,225,203,255))
 if mat=='shade_fox_tail' and face in ('west','east','up'):
  d.line([(w*.18,h*.23),(w*.5,h*.65),(w*.82,h*.23)],fill=(143,180,169,255),width=max(1,w//45))
  d.line((w*.5,h*.12,w*.5,h*.65),fill=(143,180,169,255),width=max(1,w//65))
 if mat in ('spore_cap','spore_edge'):
  for x,y in ((.23,.3),(.68,.24),(.47,.58),(.78,.75)):
   rad=max(1,min(w,h)//18);d.ellipse((w*x-rad,h*y-rad,w*x+rad,h*y+rad),fill=(223,204,205,255))
 if mat in ('bridge_bark','bridge_wood'):
  for k in range(1,5):
   x=w*k/5;d.line([(x,0),(x-w*.03,h*.3),(x+w*.03,h*.6),(x,h-1)],fill=(*tint(base,-25),255),width=max(1,w//75))
 if mat=='bridge_bark' and part=='head' and ci==0 and face in ('north','south'):
  for x in (.3,.7):d.polygon([(w*(x-.1),h*.35),(w*(x+.1),h*.39),(w*(x+.08),h*.48),(w*(x-.08),h*.45)],fill=(185,219,164,255))
 return image

def build(i):return bake(f'foe_1_{i}',f'f1_{i}_',DESIGNS[i](),paint)
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 for i in range(3):
  for path,data in build(i).items():
   if a.write:path.write_bytes(data)
   elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Forest foe art stale: '+str(path))
 print('Three forest foe prototypes: 12 files '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
