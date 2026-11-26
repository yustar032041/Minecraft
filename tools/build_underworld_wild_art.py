#!/usr/bin/env python3
"""Three individually authored underground-garden wildlife prototypes.

Shared UV baking, but each anatomy, surfaces and material channels are local.
Only the three named client models and existing maps are written. The lamp
caps' emissive MER is a material hint, not world lighting, and is unverified in
Bedrock. Requires Pillow; does not modify AI, collision or gameplay.
"""
import argparse,random
from PIL import ImageDraw
from build_forest_wild_art import c,bone,bake,PALETTE,surface,tint
PALETTE.update({
 'frog_skin':(77,110,96),'frog_belly':(163,180,147),'frog_eye':(173,198,145),'frog_pupil':(31,48,42),'frog_spot':(123,154,112),
 'lamp_stem':(166,174,157),'lamp_cap':(172,138,187),'lamp_spots':(238,212,216),
 'crystal_body':(64,54,79),'crystal_shell':(104,71,135),'crystal_highlight':(182,143,206),'crystal_leg':(77,65,91),
 'spider_body':(52,48,65),'spider_abdomen':(70,59,84),'spider_limb':(66,61,78),'spider_claw':(118,98,136),'spider_eye':(207,153,194),
})

def frog():
 # Low, wide body with distinct hind haunches, toe pads and raised eyes.
 # The three cap/stem clusters are integral child bones of the torso.
 b=[bone('body',[0,3,0],[c([-3.4,1.8,-2.7],[6.8,3,6.7],'frog_skin'),c([-3,1.5,-2.3],[6,.6,5.7],'frog_belly')]),
    bone('head',[0,3.2,-2.4],[c([-3,2.1,-5],[6,2.6,3.2],'frog_skin'),c([-2.8,1.8,-5.2],[5.6,.6,2.6],'frog_belly')],'body'),
    bone('eye_l',[-2,4.2,-3.6],[c([-2.7,4,-4.5],[1.5,1.2,1.5],'frog_eye'),c([-2.4,4.5,-4.65],[.85,.55,.35],'frog_pupil')],'head'),
    bone('eye_r',[2,4.2,-3.6],[c([1.2,4,-4.5],[1.5,1.2,1.5],'frog_eye'),c([1.55,4.5,-4.65],[.85,.55,.35],'frog_pupil')],'head')]
 for i,(x,z,h,w) in enumerate([(-1.5,0,2.3,1.5),(1.35,1.8,1.5,1.2),(.5,-1.3,1.2,1)]):
  b.append(bone('lamp_'+str(i),[x,4.5,z],[c([x-.35,4.4,z-.35],[.7,h,.7],'lamp_stem'),c([x-w/2,4.4+h-.15,z-w/2],[w,.65,w],'lamp_cap'),c([x-w*.34,4.4+h+.45,z-w*.34],[w*.68,.25,w*.68],'lamp_spots')],'body'))
 for i,(x,z) in enumerate([(-2.5,-2),(2.5,-2),(-3,2.7),(3,2.7)]):
  wide=1.25 if i<2 else 2.1
  b.append(bone('leg_'+str(i),[x,2.5,z],[c([x-wide/2,.9,z-.8],[wide,1.8,1.6],'frog_skin')],'body'))
  b.append(bone('foot_'+str(i),[x,1.2,z],[c([x-wide*.6,0,z-1.2],[wide*1.2,1.1,2],'frog_skin'),c([x-wide*.65,0,z-1.3],[wide*1.3,.35,.7],'frog_belly')],'leg_'+str(i)))
 return b

def beetle():
 # High faceted shell with individual crystals and six hinged limbs.
 b=[bone('body',[0,3,0],[c([-3.2,1.7,-2.8],[6.4,3,7.2],'crystal_body')]),
    bone('head',[0,3,-2.7],[c([-2.4,2,-5.2],[4.8,2.8,3],'crystal_body'),c([-.7,3.7,-6.1],[1.4,.9,1.1],'crystal_highlight')],'body'),
    bone('shell_l',[-.1,4,0],[c([-3.2,4.2,-2.5],[3.2,1.1,6.8],'crystal_shell'),c([-2.7,5.1,-1.9],[2.7,.8,5.2],'crystal_shell')],'body'),
    bone('shell_r',[.1,4,0],[c([0,4.2,-2.5],[3.2,1.1,6.8],'crystal_shell'),c([0,5.1,-1.9],[2.7,.8,5.2],'crystal_shell')],'body'),
    bone('crystal_l',[-1.5,5.5,0],[c([-1.95,5.6,-.8],[.9,2.5,.9],'crystal_highlight'),c([-2.7,5.6,.8],[.7,1.5,.7],'crystal_shell'),c([-2.25,5.5,-.2],[.5,.4,1.3],'crystal_shell')],'shell_l'),
    bone('crystal_r',[1.5,5.5,0],[c([1.05,5.6,.4],[.9,2,.9],'crystal_highlight'),c([2,5.6,-1],[.7,1.2,.7],'crystal_shell'),c([1.8,5.5,-.5],[.5,.4,1.2],'crystal_shell')],'shell_r')]
 for side,sign in [('l',-1),('r',1)]:
  x=sign*1.6
  b.append(bone('antenna_'+side,[x,4,-4],[c([x-.3,3.8,-5],[.6,1.5,.6],'crystal_leg'),c([x-.45,5,-5.2],[.9,.6,.9],'crystal_highlight')],'head'))
 for i in range(6):
  sign=-1 if i%2==0 else 1;z=(-2,0,2)[i//2];x=sign*2.9;ox=-5.2 if sign<0 else 2.6;fx=-5.8 if sign<0 else 4.8
  b.append(bone('leg_'+str(i),[x,2.8,z],[c([ox,2,z-.4],[2.6,.9,.8],'crystal_leg')],'body'))
  b.append(bone('foot_'+str(i),[sign*5,2.4,z],[c([fx,.2,z-.5],[1,2.3,1],'crystal_leg')],'leg_'+str(i)))
 return b

def spider():
 # Separate armored head, large abdomen, eight two-section legs and spinnerets.
 b=[bone('body',[0,3,0],[c([-3.1,2,-2.8],[6.2,3.4,5.3],'spider_body')]),
    bone('abdomen',[0,3,2],[c([-3.9,1.8,1.9],[7.8,4.2,5.5],'spider_abdomen'),c([-3.2,5.7,2.5],[6.4,.8,4.1],'spider_abdomen')],'body'),
    bone('head',[0,3,-2],[c([-2.8,2,-5.2],[5.6,2.8,2.9],'spider_body')],'body'),
    bone('fang_l',[-1.6,2.5,-4.8],[c([-2.1,.7,-5.6],[.8,1.9,.8],'spider_claw')],'head'),
    bone('fang_r',[1.6,2.5,-4.8],[c([1.3,.7,-5.6],[.8,1.9,.8],'spider_claw')],'head'),
    bone('spinner',[0,3,7],[c([-1.4,2.5,7],[1.1,1,1.3],'spider_claw'),c([.3,2.5,7],[1.1,1,1.3],'spider_claw'),c([-.4,2.5,7],[.8,1,1.1],'spider_body')],'abdomen')]
 for i in range(8):
  sign=-1 if i%2==0 else 1;z=(-2,-.5,1,2.5)[i//2];x=sign*2.9;ox=-6.3 if sign<0 else 2.8;fx=-7 if sign<0 else 5.9
  b.append(bone('leg_'+str(i),[x,3,z],[c([ox,2.5,z-.4],[3.5,1,.8],'spider_limb')],'body'))
  b.append(bone('shin_'+str(i),[sign*6,3,z],[c([fx,.2,z-.45],[1.1,2.7,.9],'spider_limb'),c([fx-.1,0,z-.55],[1.3,.6,1.1],'spider_claw')],'leg_'+str(i)))
 return b

DESIGNS=[frog,beetle,spider]

def paint(mat,w,h,seed,face,part,ci):
 # Base gradient and fine stippling, followed by material-specific painted
 # marks. Spider eyes are explicitly painted on its head's front/back faces.
 image=surface(mat,w,h,seed,face,'no_generic_eye' if part=='head' else part,ci);d=ImageDraw.Draw(image);base=PALETTE[mat]
 rng=random.Random(seed+'/detail')
 if mat=='frog_skin' and face in ('up','west','east'):
  for _ in range(max(3,w*h//900)):
   x=rng.randrange(w);y=rng.randrange(h);r=max(1,min(w,h)//18)
   d.ellipse((x-r,y-r,x+r,y+r),fill=(*tint(PALETTE['frog_spot'],rng.randint(-14,12)),255))
 if mat=='lamp_cap' and face in ('up','west','east','north','south'):
  for px,py in ((.25,.3),(.7,.27),(.48,.63),(.8,.78)):
   r=max(1,min(w,h)//12);x=w*px;y=h*py;d.ellipse((x-r,y-r,x+r,y+r),fill=(241,216,220,255))
 if mat in ('crystal_shell','crystal_highlight'):
  d.line([(w*.2,h*.9),(w*.48,h*.12),(w*.78,h*.84)],fill=(*tint(base,36),255),width=max(1,w//50))
  d.line((w*.48,h*.12,w*.52,h*.94),fill=(*tint(base,-25),255),width=max(1,w//85))
 if mat=='spider_abdomen' and face in ('up','west','east'):
  d.line([(w*.18,h*.3),(w*.5,h*.72),(w*.82,h*.3)],fill=(162,116,161,255),width=max(2,w//32))
  d.line([(w*.27,h*.2),(w*.5,h*.5),(w*.73,h*.2)],fill=(134,100,145,255),width=max(1,w//40))
 if mat=='spider_body' and part=='head' and ci==0 and face in ('north','south'):
  for x,y in ((.2,.33),(.4,.25),(.6,.25),(.8,.33),(.32,.52),(.68,.52)):
   rx=max(2,w*.055);ry=max(2,h*.09);d.ellipse((w*x-rx,h*y-ry,w*x+rx,h*y+ry),fill=(226,171,209,255))
 elif part=='head' and ci==0 and face in ('west','east') and mat=='crystal_body':
  x=w*.4;y=h*.4;r=max(2,min(w,h)*.1);d.ellipse((x-r,y-r,x+r,y+r),fill=(226,188,228,255));d.ellipse((x-r*.45,y-r*.5,x+r*.45,y+r*.5),fill=(28,27,35,255))
 return image

def mer(mat):
 # MER green=emissive material hint, not a dynamic light source. Zero elsewhere.
 return (0,72 if mat in ('lamp_cap','lamp_spots') else 0,190,255)

def build(i):return bake(f'wild_5_{i}',f'w5_{i}_',DESIGNS[i](),paint,mer)
def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args()
 if a.write==a.check:p.error('choose exactly one of --write or --check')
 for i in range(3):
  for path,data in build(i).items():
   if a.write:path.write_bytes(data)
   elif not path.exists() or path.read_bytes()!=data:raise SystemExit('Underground wildlife art stale: '+str(path))
 print('Three underground wildlife prototypes: 12 files '+('written' if a.write else 'verified'))
if __name__=='__main__':main()
