#!/usr/bin/env python3
"""Twelve individually designed grassland enemy appearance prototypes.

AI-generated realm surface materials are re-used as source detail. These are
not twelve individually authored source paintings. Each creature has its own
geometry proportions, ornaments, hierarchy and UV atlas; AI, damage, collision,
and spawn logic are never modified. Existing walk/attack tracks are remapped
by sync_grassland_foe_visuals.py. Pillow required.
"""
import argparse,json,random
from pathlib import Path
from PIL import Image,ImageChops,ImageDraw,ImageEnhance,ImageFilter
from build_guardian_appearances import face_sizes,fits,paste_with_gutter,bytes_png
ROOT=Path(__file__).resolve().parents[1];RP=ROOT/'Hakkai_v7.1.0/ResourcePack';BASE=ROOT/'tools/art_templates/mob_baselines';MAT=ROOT/'tools/art_templates/guardian_materials';SIZE=1024

def c(o,s):return {'origin':o,'size':s}
# Character-specific silhouettes, material selections and accent colors.
# Coordinates are voxel model units. No runtime combat properties are changed.
DESIGNS=[
 {'mat':'grassland','dark':(79,60,43),'accent':(212,167,90),'body':([-3.2,8,-3.2],[6.4,5.3,10.3]),'head':[c([-5,15,-7],[1.5,4,1.5]),c([3.5,15,-7],[1.5,4,1.5]),c([-6,18,-7],[2,1,1]),c([4,18,-7],[2,1,1])], 'body_add':[c([-2,13,-2],[4,1,7])]},
 {'mat':'forest','dark':(47,63,42),'accent':(145,176,91),'body':([-5,6,-3],[10,9,6]),'head':[c([-4,18,-3],[2,3,2]),c([2,18,-3],[2,3,2]),c([-.7,19,-4],[1.4,3,1.4])], 'body_add':[c([-5.5,13,-2],[2,2,4]),c([3.5,13,-2],[2,2,4])]},
 {'mat':'storm','dark':(56,62,66),'accent':(192,171,92),'body':([-5.3,6,-3],[10.6,9.5,6.2]),'head':[c([-4,17,-3],[1.5,3,2]),c([2.5,17,-3],[1.5,3,2])], 'body_add':[c([-5.5,13,-3],[3,2,6]),c([2.5,13,-3],[3,2,6]),c([-2,11,-3.6],[4,3,.8])]},
 {'mat':'desert','dark':(87,70,47),'accent':(188,153,83),'body':([-3.6,2,-2.5],[7.2,4.5,8]),'head':[c([-2,5,-7],[1,2,1]),c([1,5,-7],[1,2,1])], 'body_add':[c([-3,6,-2],[6,1.5,6]),c([-.7,7,-1],[1.4,3,1.4]),c([-2.5,7,2],[1.3,2,1.3]),c([1.2,7,2],[1.3,2,1.3])]},
 {'mat':'underworld','dark':(32,34,42),'accent':(138,153,162),'body':([-3,4,-3],[6,4,7.5]),'head':[c([-2.5,9,-5],[1,2,1]),c([1.5,9,-5],[1,2,1])], 'body_add':[c([-2,7,-1],[4,1,4])], 'wings':True},
 {'mat':'forest','dark':(66,86,60),'accent':(231,181,113),'body':([-2.2,3,-3],[4.4,5.2,7]),'head':[c([-1.5,10,-4],[1,2,1]),c([.5,10,-4],[1,2,1]),c([-.6,11,-4],[1.2,1,1])], 'body_add':[c([-1.5,7,-2],[3,1.2,5]),c([-.7,8,0],[1.4,1.3,1.4])], 'feathers':True},
 {'mat':'ice','dark':(49,67,66),'accent':(164,215,207),'body':([-5.5,2,-2],[11,4.2,7.5]),'head':[c([-.5,5,-7],[1,2,1])], 'body_add':[c([-3,6,-1],[1.5,3,1.5]),c([-.75,6,0],[1.5,4,1.5]),c([1.5,6,1],[1.5,3,1.5])]},
 {'mat':'clockwork','dark':(86,70,57),'accent':(206,172,112),'body':([-2.8,3,-3],[5.6,4,7]),'head':[c([-2,13,-4],[1,2,1]),c([1,13,-4],[1,2,1]),c([-.5,9,-7.3],[1,2,.6])], 'body_add':[c([-1.8,6,-1],[3.6,1,4])]},
 {'mat':'grassland','dark':(93,64,43),'accent':(223,143,83),'body':([-3.6,8,-3],[7.2,5.5,10.5]),'head':[c([-6,16,-6],[1.5,4,1.5]),c([4.5,16,-6],[1.5,4,1.5]),c([-7,19,-6],[2,1,1]),c([5,19,-6],[2,1,1]),c([-2,14,-8],[4,1,1])], 'body_add':[c([-3.5,13,-2],[7,1.5,5])]},
 {'mat':'sky','dark':(54,64,75),'accent':(229,216,153),'body':([-2.4,3,-3],[4.8,5,7]),'head':[c([-.6,10,-4],[1.2,2,1]),c([-2,10,-4],[1,1,1]),c([1,10,-4],[1,1,1])], 'body_add':[c([-1.6,7,-2],[3.2,1.3,4])], 'feathers':True},
 {'mat':'forest','dark':(52,58,38),'accent':(168,181,94),'body':([-5.2,6,-3],[10.4,9,6]),'head':[c([-4,17,-3],[1.5,3,1.5]),c([2.5,17,-3],[1.5,3,1.5]),c([-.7,19,-3],[1.4,2,1.4])], 'body_add':[c([-6.7,11,-2],[2,3,3]),c([4.7,11,-2],[2,3,3]),c([-1,14,-2],[2,2,4])]},
 {'mat':'sky','dark':(108,106,104),'accent':(244,188,193),'body':([-2,3,-2],[4,4,5]),'head':[c([-2,9,-4],[.7,2,1]),c([1.3,9,-4],[.7,2,1]),c([-.7,9,-4],[1.4,1,1])], 'body_add':[c([-1.5,6,-1],[3,1,3])], 'wings':True,'butterfly':True},
]

def individual_bone(name,pivot,cubes,parent=None):
 b={'name':name,'pivot':pivot,'cubes':cubes}
 if parent:b['parent']=parent
 return b

def bespoke_deer_or_bird(index):
 """Reauthor four previously over-similar silhouettes, keeping main joints.

 Their proportions, limb geometry and hierarchy are independent; source art
 is still shared and remains a prototype. Gameplay and collision are untouched.
 """
 B=individual_bone
 if index==0:
  # Windcutter: a slim long-legged deer, hinged lower legs and forked antlers.
  b=[B('body',[0,8,0],[c([-2.8,7.2,-3.2],[5.6,4.8,9.8])]),
     B('head',[0,10,-3.1],[c([-1.8,9.5,-6.7],[3.6,3.4,3.8]),c([-.9,9.4,-8.4],[1.8,1.3,2])],'body'),
     B('body_detail_0',[0,11,0],[c([-2.9,11,-2.7],[5.8,1.2,3.2]),c([-2.3,12,0],[4.6,.6,3.2])],'body'),
     B('tail',[0,9,6],[c([-.6,8.4,6.3],[1.2,1.4,2.2])],'body')]
  for side,sign in [('l',-1),('r',1)]:
   x=-1.7 if sign<0 else .8;branch=-4.7 if sign<0 else 1.7
   b.append(B('head_detail_'+('0' if sign<0 else '1'),[sign*1.2,12.5,-5],[c([x,12.4,-5.8],[.9,4.5,1.1]),c([branch,16,-5.8],[3,1,1.1]),c([branch if sign<0 else 3.8,16.8,-5.8],[.9,1.9,1.1])],'head'))
  for i,(x,z) in enumerate([(-1.8,-1.9),(1.8,-1.9),(-1.8,5.1),(1.8,5.1)]):
   b.append(B(f'leg_{i}',[x,7.4,z],[c([x-.55,3.3,z-.5],[1.1,4.2,1])]))
   b.append(B(f'shin_{i}',[x,3.4,z],[c([x-.4,.5,z-.4],[.8,3, .8]),c([x-.65,0,z-.8],[1.3,.7,1.5])],f'leg_{i}'))
 elif index==8:
  # Horn general: broad forward-set armored body, heavier split limbs and
  # lateral bull-like horns rather than another copy of the slim deer.
  b=[B('body',[0,8,0],[c([-4.3,6.3,-3.6],[8.6,7.2,10]),c([-4.6,10.5,-3.4],[9.2,2.6,4.2])]),
     B('head',[0,10,-3.2],[c([-2.9,9,-7.2],[5.8,4.7,4.2]),c([-1.6,8.8,-9.1],[3.2,1.9,2.3])],'body'),
     B('body_detail_0',[0,13,0],[c([-3.8,13,-2.8],[7.6,1.4,5.7]),c([-2.5,14.1,-1.7],[5,1,3.3])],'body'),
     B('tail',[0,9,6],[c([-.9,8.3,6.2],[1.8,1.8,2.3]),c([-1.2,8,8],[2.4,2.2,1])],'body')]
  for side,sign in [('l',-1),('r',1)]:
   x=-5.7 if sign<0 else 2.6;tip=-6.3 if sign<0 else 5.2
   b.append(B('head_detail_'+('0' if sign<0 else '1'),[sign*2.6,12,-5.4],[c([x,12,-6],[3.1,1.3,1.4]),c([tip,12,-6],[1.1,3,1.4]),c([tip,14.5,-6],[1.1,.9,2])],'head'))
  for i,(x,z) in enumerate([(-2.8,-2.2),(2.8,-2.2),(-2.8,4.7),(2.8,4.7)]):
   b.append(B(f'leg_{i}',[x,6.6,z],[c([x-1.05,2.7,z-.9],[2.1,4.1,1.8])]))
   b.append(B(f'shin_{i}',[x,2.8,z],[c([x-.8,.5,z-.7],[1.6,2.5,1.4]),c([x-1.15,0,z-1.1],[2.3,.8,2.1])],f'leg_{i}'))
 elif index==5:
  # Pollen keeper: broad-spreading layered wings and a pollen blossom behind.
  b=[B('body',[0,6,0],[c([-2.3,3.5,-2.8],[4.6,4.7,6.6]),c([-1.7,3.2,2.8],[3.4,1,2.4])]),
     B('head',[0,7,-2.5],[c([-1.8,6,-5.3],[3.6,3.3,3.2]),c([-.7,6.2,-6.8],[1.4,1,1.8])],'body'),
     B('head_detail_0',[0,9,-4],[c([-.65,9,-4.6],[1.3,1.8,1.2])],'head'),
     B('body_detail_0',[0,8,1],[c([-.8,7.8,.1],[1.6,1.4,1.7]),c([-2,9,-.8],[4,.8,3.5]),c([-1.3,9.6,-.1],[2.6,.6,2.1]),
       c([-2.4,10,-.1],[1.5,.55,2.1]),c([.9,10,-.1],[1.5,.55,2.1]),
       c([-.9,10,-1.4],[1.8,.55,1.4]),c([-.9,10,1.8],[1.8,.55,1.4]),
       c([-.65,10.1,.3],[1.3,.55,1.3])],'body'),
     B('tail',[0,4.5,3],[c([-1.5,4.4,3],[3,.7,3]),c([-2,4.2,5.5],[4,.6,1.5])],'body')]
  for side,sign in [('l',-1),('r',1)]:
   x=-6.5 if sign<0 else 2.1;tip=-9.4 if sign<0 else 6
   b.append(B('wing_'+side,[sign*2.1,6.4,0],[c([x,5.9,-2],[4.4,.8,5.3]),c([x,5.6,2.5],[4.4,.5,1.5])],'body'))
   b.append(B('wing_'+side+'_tip',[sign*6,6.4,0],[c([tip,5.8,-1.4],[3.4,.7,4.8]),c([tip,5.5,2.7],[3.4,.5,1.3])],'wing_'+side))
  for i,x in enumerate((-1.1,1.1)):
   b.append(B(f'leg_{i}',[x,3.8,.4],[c([x-.4,.5,0],[.8,3.4,.8]),c([x-.6,0,-.7],[1.2,.7,1.8])]))
 elif index==9:
  # Beacon bird: upright stance, folded articulated wings and a tall lantern.
  b=[B('body',[0,6,0],[c([-2.5,2.7,-2.4],[5,5.9,5.7]),c([-2,3,-2.8],[4,4,.6])]),
     B('head',[0,8.3,-1.8],[c([-2.1,8,-4.4],[4.2,3.5,3.6]),c([-.7,8.2,-6],[1.4,1,1.9])],'body'),
     B('head_detail_0',[0,11,-3],[c([-.7,11.2,-3.6],[1.4,2.1,1.2])],'head'),
     B('body_detail_0',[0,8,1],[c([-.8,8.2,.3],[1.6,2.4,1.6]),c([-1.4,10.4,-.3],[2.8,2,2.6]),c([-.8,12.2,.1],[1.6,.8,1.8])],'body'),
     B('tail',[0,4,3],[c([-2,3.6,2.8],[4,.8,2.8]),c([-2.6,3.4,5],[5.2,.6,1.6])],'body')]
  for side,sign in [('l',-1),('r',1)]:
   x=-4 if sign<0 else 2.4;tip=-4.1 if sign<0 else 2.6
   b.append(B('wing_'+side,[sign*2.4,7.4,0],[c([x,4,-1.6],[1.6,3.8,4.2])],'body'))
   b.append(B('wing_'+side+'_tip',[sign*3.2,4.5,0],[c([tip,2.9,-1],[1.5,1.7,3.5])],'wing_'+side))
  for i,x in enumerate((-1.2,1.2)):
   b.append(B(f'leg_{i}',[x,2.9,.4],[c([x-.4,.5,0],[.8,2.6,.8]),c([x-.7,0,-.7],[1.4,.7,1.8])]))
 else:raise ValueError(index)
 prefix=f'f0_{index}_'
 for b_ in b:
  b_['name']=prefix+b_['name']
  if b_.get('parent'):b_['parent']=prefix+b_['parent']
 return {'format_version':'1.12.0','minecraft:geometry':[{'description':{'identifier':f'geometry.hakkai.foe_0_{index}','texture_width':SIZE,'texture_height':SIZE,'visible_bounds_width':4,'visible_bounds_height':4,'visible_bounds_offset':[0,1,0]},'bones':b}]}

def rig(index):
 if index in (0,5,8,9):return bespoke_deer_or_bird(index)
 name=f'foe_0_{index}';obj=json.loads((BASE/(name+'.geo.json')).read_text(encoding='utf8'));model=obj['minecraft:geometry'][0];theme=DESIGNS[index]
 model['description'].update(texture_width=SIZE,texture_height=SIZE,visible_bounds_width=4,visible_bounds_height=4)
 old={b['name']:b for b in model['bones']};origin,size=theme['body'];old['body']['cubes'][0]['origin']=origin[:];old['body']['cubes'][0]['size']=size[:]
 # Remove originally floating decorative cubes from these templates; new
 # character-specific attachments below replace them at intentional heights.
 if index in (3,4,6,11):old['body']['cubes']=old['body']['cubes'][:2 if index in (3,6) else 1]
 if index in (5,9):
  # The inherited third head cube sat above and in front of the head,
  # disconnected from both the head and its new crest.
  old['head']['cubes']=old['head']['cubes'][:2]
 if index==7:
  # Move the old overhead crossbar to the ear roots as a small clockwork
  # band. Both shortened ears still touch it, but no square frame floats above
  # the head; keep the head bone and animation IDs intact.
  for ear in old['head']['cubes'][2:4]:ear['size'][1]=3.5
  bridge=old['head']['cubes'][4]
  bridge['origin']=[-2,8.5,-5.25];bridge['size']=[4,.8,1.25]
 if index==11:
  # A small, winged creature instead of the old unwinged hare silhouette.
  old['head']['cubes']=old['head']['cubes'][:2]
  old['head']['cubes'][0]['origin']=[-1.5,6,-5];old['head']['cubes'][0]['size']=[3,3,3]
  old['head']['cubes'][1]['origin']=[-.6,6,-6];old['head']['cubes'][1]['size']=[1.2,1,1]
 if theme.get('wings'):
  if index==4:
   wings=[('wing_l',[-2,6,0],[-8,5,-2],[6,1,6]),('wing_r',[2,6,0],[2,5,-2],[6,1,6])]
  else:
   wings=[('wing_l',[-2,6,0],[-9,5,-2],[7,1,6]),('wing_r',[2,6,0],[2,5,-2],[7,1,6])]
  for wing,pivot,o,s in wings:
   b={'name':wing,'parent':'body','pivot':pivot,'cubes':[c(o,s)]};model['bones'].append(b);old[wing]=b
 for parent,key in [('head','head'),('body','body_add')]:
  for j,cube in enumerate(theme[key]):
   cube=json.loads(json.dumps(cube))
   if index==7 and key=='head' and j in (0,1):cube['origin'][1]=12.2;cube['size'][1]=1.3
   o=cube['origin'];s=cube['size'];model['bones'].append({'name':f'f0_{index}_{parent}_detail_{j}','parent':parent,'pivot':[o[0]+s[0]/2,o[1],o[2]+s[2]/2],'cubes':[cube]})
 if theme.get('feathers') or theme.get('wings'):
  # Individual wing tips are attached to animated wing bones.
  for side in ('l','r'):
   for j in range(2):
    x=-8.5-j if side=='l' else 6+j
    if theme.get('butterfly'):x=-9-j if side=='l' else 7+j
    cube=c([x,4.8,-1+j*2],[2,1,3]);model['bones'].append({'name':f'f0_{index}_wing_{side}_detail_{j}','parent':f'wing_{side}','pivot':[x+1,5,-1+j*2],'cubes':[cube]})
 if index in (3,6):
  # The inherited insect/spider legs were flat bars suspended two model
  # units above the ground. Add connected downward outer segments and small
  # feet to each existing animated leg, without changing the gameplay box.
  for j in range(6 if index==3 else 8):
   leg=old[f'leg_{j}'];root=leg['cubes'][0];side=-1 if j%2==0 else 1
   x=root['origin'][0] if side<0 else root['origin'][0]+root['size'][0]-.9
   z=root['origin'][2]
   leg['cubes'].append(c([x,0,z],[.9,2.3,1]))
   leg['cubes'].append(c([x-.25,0,z-.4],[1.4,.45,1.8]))
 if index==10:
  # Bladed bramble beast: the inherited square soldier silhouette was almost
  # identical to foe_0_1. Stepped thorn blades are attached to the animated
  # arms; the back ridge belongs to the body, not to gameplay hitboxes.
  for side,sign in [('l',-1),('r',1)]:
   # Root overlaps the outside of the corresponding arm and adjoining steps
   # overlap each other. These are rigid visual extensions of the arm.
   cubes=([c([-9.2,7,-1.7],[1.8,1.7,3.4]),c([-11.2,7.5,-1.4],[2.2,1.4,2.8]),c([-12.5,8,-1.1],[1.5,1,2.2])] if sign<0 else
          [c([7.4,7,-1.7],[1.8,1.7,3.4]),c([9,7.5,-1.4],[2.2,1.4,2.8]),c([11,8,-1.1],[1.5,1,2.2])])
   model['bones'].append({'name':f'f0_10_arm_{side}_detail_blade','parent':f'arm_{side}','pivot':[sign*7.5,8,0],'cubes':cubes})
  model['bones'].append({'name':'f0_10_body_detail_ridge','parent':'body','pivot':[0,14,2],
                         'cubes':[c([-1.2,13,2.5],[2.4,2.8,2.2]),c([-1,15,3.8],[2,2.3,2]),c([-.7,16.7,5.2],[1.4,1.7,1.4])]})
 mapping={name:f'f0_{index}_{name}' for name in old}
 for bone in model['bones']:
  if bone['name'] in mapping:bone['name']=mapping[bone['name']]
  if bone.get('parent') in mapping:bone['parent']=mapping[bone['parent']]
 return obj

def build(index):
 theme=DESIGNS[index];ident=f'foe_0_{index}';prefix=f'f0_{index}_';obj=rig(index);model=obj['minecraft:geometry'][0]
 density=next((d for d in range(22,6,-1) if fits(model,d)),None)
 if density is None:raise ValueError(f'{ident} UV overflow')
 source=Image.open(MAT/(theme['mat']+'.png')).convert('RGB');sw,sh=source.size
 atlas=Image.new('RGBA',(SIZE,SIZE),(0,0,0,0));mer=Image.new('RGBA',(SIZE,SIZE),(0,0,185,0));normal=Image.new('RGBA',(SIZE,SIZE),(128,128,252,0));x=y=3;row=0
 for bone in model['bones']:
  name=bone['name'];base=name.removeprefix(prefix);detail='_detail_' in name
  for ci,cube in enumerate(bone.get('cubes',[])):
   uv={}
   for face,(a,b) in face_sizes(cube).items():
    w=max(5,round(a*density));h=max(5,round(b*density));pad=3
    if x+w+pad>SIZE:x=3;y+=row;row=0
    if y+h+pad>SIZE:raise ValueError(f'{ident} UV overflow')
    uv[face]={'uv':[x,y],'uv_size':[w,h]};rng=random.Random(f'{ident}/{name}/{ci}/{face}')
    cw=min(sw,max(60,w*4));ch=min(sh,max(60,h*4));ox=rng.randrange(sw-cw+1);oy=rng.randrange(sh-ch+1)
    image=source.crop((ox,oy,ox+cw,oy+ch)).resize((w,h),Image.Resampling.LANCZOS)
    image=Image.blend(image,Image.new('RGB',(w,h),theme['accent'] if detail else theme['dark']),.38 if detail else .28)
    if index==5 and base=='body_detail_0' and ci>=3:
     # Four blush-colored petals with a warm pollen centre, distinct from
     # the dark leaf-textured wing and trunk.
     color=(232,174,176) if ci<7 else (239,196,82)
     image=Image.blend(image,Image.new('RGB',(w,h),color),.78)
    if index==9 and base=='body_detail_0' and ci==1:
     # Golden lantern glass. Decorative material only: no emitted light.
     image=Image.blend(image,Image.new('RGB',(w,h),(239,188,85)),.72)
    image=ImageEnhance.Brightness(image).enhance({'up':1.1,'down':.78,'west':.93,'east':.98,'north':1,'south':.94}[face]).convert('RGBA');draw=ImageDraw.Draw(image)
    if index==9 and base=='body_detail_0' and ci==1 and face in ('north','south','west','east'):
     # A thin dark frame differentiates the lantern from the pale feathers.
     width=max(1,min(w,h)//24);frame=(109,75,42,255)
     draw.rectangle((width,width,w-1-width,h-1-width),outline=frame,width=width)
     draw.line((w*.5,h*.15,w*.5,h*.85),fill=frame,width=width)
    if index in (0,8) and base=='head' and ci==1 and face=='north':
     for fx in (.3,.7):
      ex,ey=w*fx,h*.52;rx=max(1,w*.045);ry=max(1,h*.055)
      draw.ellipse((ex-rx,ey-ry,ex+rx,ey+ry),fill=(37,28,23,255))
    if base=='head' and ci==0 and ((index in (1,2,10) and face=='north') or (index not in (1,2,10) and face in ('west','east'))):
     # The three upright enemies have paired frontal eyes. Animals keep their
     # lateral eyes; avoid introducing a misleading third pair of eyes.
     centers=(.28,.72) if index in (1,2,10) else (.4,)
     ey=h*(.25 if index in (1,2,10) else .43);rx=max(2,w*.075);ry=max(2,h*.085)
     for fx in centers:
      ex=w*fx
      draw.ellipse((ex-rx-1,ey-ry-1,ex+rx+1,ey+ry+1),fill=(25,23,22,255));draw.ellipse((ex-rx,ey-ry,ex+rx,ey+ry),fill=(*theme['accent'],255));draw.line((ex,ey-ry*.7,ex,ey+ry*.7),fill=(22,20,22,255),width=max(1,w//70))
    if base=='body' and ci==0 and face in ('west','east'):
     # Crest position and number differ by species, rather than shared color
     # swaps. These markings are decorative, not warnings or emissive effects.
     color=(*theme['accent'],255);cy=h*(.32+.04*(index%3));cx=w*.5;r=min(w,h)*.15
     if index in (0,8):draw.arc((cx-r,cy-r,cx+r,cy+r),30,315,fill=color,width=max(2,w//45))
     elif index in (1,3,10):draw.polygon([(cx,cy-r),(cx+r,cy),(cx,cy+r),(cx-r,cy)],outline=color,width=max(2,w//45))
     elif index in (2,6):draw.line([(cx-r,cy+r),(cx-r*.2,cy-r),(cx+r*.1,cy),(cx+r,cy-r)],fill=color,width=max(2,w//45))
     elif index in (4,5,9,11):draw.arc((cx-r,cy-r,cx+r,cy+r),5,175,fill=color,width=max(2,w//45));draw.line((cx,cy-r,cx,cy+r),fill=color,width=max(2,w//50))
     else:draw.ellipse((cx-r,cy-r,cx+r,cy+r),outline=color,width=max(2,w//45));draw.line((cx,cy-r*.7,cx,cy+r*.5),fill=color,width=max(1,w//60))
    paste_with_gutter(atlas,image,x,y);paste_with_gutter(mer,Image.new('RGBA',(w,h),(0,0,185,255)),x,y)
    # Generate normal data face by face; adjacent unrelated UV patches should
    # not inject artificial bevels. A flat border and extruded gutters reduce
    # seams, although real PBR rendering still requires Bedrock validation.
    gray=image.convert('L').filter(ImageFilter.GaussianBlur(.6))
    nr=ImageChops.subtract(ImageChops.offset(gray,1,0),ImageChops.offset(gray,-1,0),scale=5,offset=128)
    ng=ImageChops.subtract(ImageChops.offset(gray,0,1),ImageChops.offset(gray,0,-1),scale=5,offset=128)
    patch=Image.merge('RGBA',(nr,ng,Image.new('L',(w,h),252),Image.new('L',(w,h),255)))
    ImageDraw.Draw(patch).rectangle((0,0,w-1,h-1),outline=(128,128,252,255),width=1)
    paste_with_gutter(normal,patch,x,y)
    x+=w+pad;row=max(row,h+pad)
   cube['uv']=uv
 return {RP/f'models/entity/{ident}.geo.json':(json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode(),RP/f'textures/entity/{ident}.png':bytes_png(atlas),RP/f'textures/entity/{ident}_mer.png':bytes_png(mer),RP/f'textures/entity/{ident}_n.png':bytes_png(normal)}

def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');args=p.parse_args()
 if args.write==args.check:p.error('choose exactly one of --write or --check')
 for i in range(12):
  for path,data in build(i).items():
   if args.write:path.write_bytes(data)
   elif not path.exists() or path.read_bytes()!=data:raise SystemExit(f'Grassland foe art stale: {path}')
 print('Twelve grassland foe appearance prototypes: 48 files '+('written' if args.write else 'verified'))
if __name__=='__main__':main()
