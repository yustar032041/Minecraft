#!/usr/bin/env python3
"""Eight distinct realm-traveler geometry/UV/material prototypes.

Uses individually authored realm materials and silhouettes, eye colors,
proportions and articulated hierarchies per traveler.
Only writes the eight named new models and their existing color/MER/normal PNGs.
No vanilla assets, behavior, collision, drops or attack timings are touched.
"""
import argparse, io, json, random
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter
from build_guardian_appearances import face_sizes, fits, paste_with_gutter, bytes_png
ROOT=Path(__file__).resolve().parents[1]
RP=ROOT/'Hakkai_v7.1.0/ResourcePack';BASE=ROOT/'tools/art_templates/mob_baselines/realm_ender.geo.json';MATERIAL=ROOT/'tools/art_templates/traveler_materials';SIZE=1024

def c(origin,size):return {'origin':origin,'size':size}
# Individual arrangements rather than automated recolors. Cube positions in
# model units; parents follow the part during the current walk/attack rig.
DESIGNS=[
 {'mat':'wind','eye':(146,231,157),'dark':(19,27,24),'chest':(84,145,94),'bodyw':7.6,'headw':7.8,'elbow':21,'knee':10,
  'head':[c([-5,41,-2],[1.2,3,2]),c([3.8,41,-2],[1.2,3,2]),c([-2.5,43,-3],[5,1,1])],
  'body':[c([-4.1,29,-2.6],[1,6,.8]),c([3.1,29,-2.6],[1,6,.8]),c([-2,20,-2.5],[4,6,.6])]},
 {'mat':'mist','eye':(134,219,185),'dark':(20,29,26),'chest':(74,132,96),'bodyw':8.8,'headw':8.2,'elbow':20,'knee':9.3,
  'head':[c([-5,40,-2],[1.5,3,2]),c([3.5,40,-2],[1.5,3,2]),c([-3,44,-1],[2,1.4,2]),c([1,44,-1],[2,1.4,2])],
  'body':[c([-4.6,31,-2.5],[2,4,1]),c([2.6,31,-2.5],[2,4,1]),c([-2.5,20,-2.5],[5,3,1]),c([-1,34,2],[2,2,1])]},
 {'mat':'desert','eye':(250,190,101),'dark':(37,29,24),'chest':(177,129,72),'bodyw':9.2,'headw':8.4,'elbow':20.8,'knee':8.8,
  'head':[c([-4.4,43,-4.3],[8.8,1.2,1]),c([-5,41,-1],[1.5,3,2]),c([3.5,41,-1],[1.5,3,2])],
  'body':[c([-4.7,33,-2.6],[9.4,1.8,1]),c([-4.5,20,-2.7],[2,10,1]),c([2.5,20,-2.7],[2,10,1])]},
 {'mat':'frost','eye':(174,236,255),'dark':(20,29,40),'chest':(113,191,220),'bodyw':7.2,'headw':7.6,'elbow':21.5,'knee':10.7,
  'head':[c([-.6,43,-4],[1.2,3,1.5]),c([-3.6,43,-3],[1.3,2,1]),c([2.3,43,-3],[1.3,2,1])],
  'body':[c([-4.2,32,-2],[2,3,2]),c([2.2,32,-2],[2,3,2]),c([-.8,24,-2.8],[1.6,5,1.1]),c([-2,20,-2.5],[4,2,1])]},
 {'mat':'thunder','eye':(253,208,99),'dark':(26,28,37),'chest':(213,171,72),'bodyw':9,'headw':8,'elbow':19.8,'knee':9.1,
  'head':[c([-5,41,-3],[1,3,1]),c([4,41,-3],[1,3,1]),c([-3,44,-1],[1.5,2,1]),c([1.5,44,-1],[1.5,2,1])],
  'body':[c([-5,32,-2.15],[2.5,3,3.15]),c([2.5,32,-2.15],[2.5,3,3.15]),c([-.6,24,-2.7],[1.2,5,1]),c([-2.5,22,-2.7],[3,1,1])]},
 {'mat':'abyss','eye':(196,140,244),'dark':(25,19,37),'chest':(134,85,169),'bodyw':7.5,'headw':8.2,'elbow':22,'knee':10.3,
  'head':[c([-4.6,42,-3],[1,2,1]),c([3.6,42,-3],[1,2,1]),c([-.8,43,-4],[1.6,2.6,1.6])],
  'body':[c([-3.6,31,2],[2,4,1]),c([1.6,31,2],[2,5,1]),c([-.8,20,-2.6],[1.6,9,.8])]},
 {'mat':'sky','eye':(196,224,255),'dark':(30,35,48),'chest':(154,189,215),'bodyw':7.4,'headw':7.5,'elbow':21.7,'knee':10.5,
  'head':[c([-5,42,-1],[1.5,1,3]),c([3.5,42,-1],[1.5,1,3]),c([-1.5,44,-2],[3,1,2])],
  'body':[c([-5,33,-1],[2.2,2,3]),c([2.8,33,-1],[2.2,2,3]),c([-3,20,-2.6],[1.2,8,1.1]),c([1.8,20,-2.6],[1.2,8,1.1])]},
 {'mat':'time','eye':(247,183,116),'dark':(36,27,29),'chest':(202,145,75),'bodyw':8.6,'headw':8,'elbow':20.4,'knee':9.6,
  'head':[c([-3,44,-3],[6,1,1]),c([-4.4,40,-1],[1,4,1]),c([3.4,40,-1],[1,4,1])],
  'body':[c([-3.5,27.2,-2.7],[7,1.4,.8]),c([-4.4,23,-2.6],[1.2,10,.8]),c([3.2,23,-2.6],[1.2,10,.8]),c([-2,20,-2.7],[4,2,.9])]},
]


# Model-unit decorations are attached to head or torso; they give each realm
# a distinct outline without changing the shared Enderman-like proportions.
# They are decorative, not collision geometry or new combat abilities.
SILHOUETTES=[
 # Wind: crossed scarf and swept-back ribbons.
 {'head':[c([-5.8,42,-1],[2.4,1.1,2]),c([3.4,42,-1],[2.4,1.1,2])],
  'body':[c([-5.8,33,1.4],[3,1.3,3.7]),c([2.8,33,1.4],[3,1.3,3.7]),c([-3.5,27,2],[1.3,6,3.4]),c([1.9,24,2],[1.3,9,2.8])]},
 # Mist: broad shoulder mantle with asymmetric drooping leaves.
 {'head':[c([-6,41,0],[2.8,1.4,3]),c([3.2,41,0],[2.8,1.4,3]),c([-5.3,42,1],[1.3,2.2,1.5]),c([4,42,1],[1.3,2.2,1.5])],
  'body':[c([-6.4,32,1],[3,2.5,3.6]),c([3.4,32,1],[3,2.5,3.6]),c([-5.5,27,2],[2,5,2.2]),c([3.5,29,2],[1.8,3,2.6])]},
 # Sand: wrap-like shoulder cloth, asymmetrical trailing sash and brow.
 {'head':[c([-5.3,39,1.5],[1.8,4,3.2]),c([3.5,39,1.5],[1.8,4,3.2])],
  'body':[c([-5.4,32,1],[10.8,2.4,3]),c([-4.5,24,2],[2.1,8,2.3]),c([2.5,20,2],[1.7,12,2.2])]},
 # Ice: different-height crystal spines around the head and shoulders.
 {'head':[c([-5,42,0],[1.8,4.5,2]),c([3.2,42,0],[1.8,3.4,2]),c([-.6,44,0],[1.2,3.4,1.4])],
  'body':[c([-5.3,32,0],[2.5,4.7,2]),c([2.8,32,0],[2.5,3.4,2]),c([-.8,27,1.7],[1.6,6,2.8])]},
 # Thunder: angular asymmetrical horns and layered shoulder plates.
 {'head':[c([-6.3,42,0],[3.1,1.5,2]),c([-6.25,43,-.12],[1.5,3,2.24]),c([3.2,42,0],[2.8,1.4,2])],
  'body':[c([-6.6,32,0],[3.3,2.7,3.3]),c([3.3,31,0],[3.3,3.7,3.3]),c([-4.4,23,2],[1.2,9,1.6]),c([3.2,26,2],[1.2,6,1.6])]},
 # Abyss: raised fungal canopy and clustered back spines.
 {'head':[c([-5.7,42,0],[2.3,2.3,3]),c([3.4,42,0],[2.3,2.3,3]),c([-6,43.8,-.5],[3.4,1.2,4]),c([2.6,43.8,-.5],[3.4,1.2,4])],
  'body':[c([-4.6,32,1.5],[2.6,3.2,3]),c([2,30,1.5],[2.6,4.7,3]),c([-1,26,2],[2,7.5,3])]},
 # Sky: layered folded feather-like panels rather than a flying ability.
 {'head':[c([-5.7,42,0],[2.7,1,3]),c([3,42,0],[2.7,1,3])],
  'body':[c([-7.3,32,1],[4.1,2.2,3.2]),c([3.2,32,1],[4.1,2.2,3.2]),c([-6.3,28.5,2],[3.1,3.5,2]),c([3.2,28.5,2],[3.1,3.5,2]),c([-1,24,1.65],[2,8,2.75])]},
 # Time: squared clock frame behind the body, readable from the back.
 {'head':[c([-5.3,42,.5],[2.1,1.4,2]),c([3.2,42,.5],[2.1,1.4,2])],
  'body':[c([-4.6,33,2],[9.2,1.4,1.5]),c([-4.6,26,2],[1.4,7,1.5]),c([3.2,26,2],[1.4,7,1.5]),c([-4.6,25,2],[9.2,1.4,1.5]),c([-.5,27,2],[1,5,2])]},
]

# Separate body construction per realm: chest and waist widths/depths plus
# articulated limb thickness and hip separation (model units, not collision).
# Keep the familiar upright traveler identity, but vary the actual structure,
# not just colors or ornaments. Elbows and knees remain realm-specific.
BUILD_PROPORTIONS=[
 {'waist':6.1,'depth':3.8,'arm':2.0,'arm_depth':2.1,'leg':2.7,'leg_depth':3.2,'gap':1.0}, # wind: light runner
 {'waist':7.8,'depth':4.6,'arm':2.6,'arm_depth':2.8,'leg':3.5,'leg_depth':3.8,'gap':1.0}, # mist: sturdy
 {'waist':8.0,'depth':4.8,'arm':3.0,'arm_depth':2.8,'leg':3.6,'leg_depth':4.2,'gap':1.1}, # desert: broad wrapped
 {'waist':5.5,'depth':3.5,'arm':1.8,'arm_depth':2.0,'leg':2.4,'leg_depth':3.2,'gap':.8}, # ice: slender
 {'waist':7.4,'depth':4.0,'arm':3.2,'arm_depth':3.1,'leg':3.7,'leg_depth':4.3,'gap':1.1}, # thunder: heavy limbs
 {'waist':5.9,'depth':4.3,'arm':2.2,'arm_depth':2.8,'leg':2.7,'leg_depth':4.0,'gap':.9}, # abyss: narrow waist
 {'waist':5.6,'depth':3.4,'arm':1.8,'arm_depth':2.1,'leg':2.6,'leg_depth':3.3,'gap':1.0}, # sky: light frame
 {'waist':7.0,'depth':4.2,'arm':2.7,'arm_depth':2.8,'leg':3.2,'leg_depth':3.8,'gap':1.0}, # time: square stance
]

def emblem(draw,index,w,h,color):
 # Individually authored, readable chest motifs, keyed by realm rather than
 # using the same geometric mark on eight color variants.
 cx=w/2;cy=h*.30;rx=w*.18;ry=h*.095;th=max(2,w//45)
 if index==0:
  draw.arc((cx-rx,cy-ry,cx+rx,cy+ry),15,320,fill=color,width=th)
  draw.line([(cx-rx,cy+ry*.45),(cx+rx*.4,cy+ry*.45),(cx+rx*.8,cy)],fill=color,width=th)
 elif index==1:
  draw.polygon([(cx,cy-ry),(cx+rx,cy),(cx,cy+ry),(cx-rx,cy)],outline=color,width=th)
  draw.line((cx,cy-ry,cx,cy+ry),fill=color,width=th)
 elif index==2:
  for dy in (-.65,0,.65):draw.line((cx-rx,cy+dy*ry,cx+rx,cy+dy*ry),fill=color,width=th)
 elif index==3:
  draw.polygon([(cx,cy-ry),(cx+rx,cy),(cx,cy+ry),(cx-rx,cy)],outline=color,width=th)
  draw.line((cx,cy-ry,cx,cy+ry),fill=color,width=th);draw.line((cx-rx,cy,cx+rx,cy),fill=color,width=th)
 elif index==4:
  draw.line([(cx+rx*.5,cy-ry),(cx-rx*.45,cy),(cx+rx*.35,cy),(cx-rx*.5,cy+ry)],fill=color,width=th+1)
 elif index==5:
  for dx,dy,r in [(-.38,-.25,.35),(.36,.05,.28),(0,.55,.23)]:
   x=cx+dx*rx;y=cy+dy*ry;rr=min(rx,ry)*r;draw.ellipse((x-rr,y-rr,x+rr,y+rr),outline=color,width=th)
 elif index==6:
  draw.arc((cx-rx,cy-ry*.55,cx+rx,cy+ry*.7),175,350,fill=color,width=th)
  draw.arc((cx-rx*.55,cy-ry,cx+rx*.55,cy+ry*.2),175,350,fill=color,width=th)
 else:
  r=min(rx,ry);draw.ellipse((cx-r,cy-r,cx+r,cy+r),outline=color,width=th)
  draw.line([(cx,cy-r*.7),(cx,cy),(cx+r*.6,cy+r*.25)],fill=color,width=th)

def build(index):
 theme=DESIGNS[index];p=f'e{index}_';obj=json.loads(BASE.read_text(encoding='utf8'));model=obj['minecraft:geometry'][0]
 model['description'].update(identifier=f'geometry.hakkai.ender_{index}',texture_width=SIZE,texture_height=SIZE,visible_bounds_width=4,visible_bounds_height=4.5)
 old={b['name']:b for b in model['bones']}
 shape=BUILD_PROPORTIONS[index];w=theme['bodyw'];depth=shape['depth'];waist=shape['waist']
 # The upper torso and a narrower/larger waist are separate real cubes.
 # Preserve the emblem on the upper torso only (see face painting below).
 old['body']['cubes']=[c([-w/2,24,-depth/2],[w,12,depth]),c([-waist/2,20,-depth*.45],[waist,4,depth*.9])]
 w=theme['headw'];old['head']['cubes'][0]['origin']=[-w/2,36,-4];old['head']['cubes'][0]['size']=[w,8,8]
 for part in ('right_arm','left_arm','right_leg','left_leg'):
  bone=old[part];piece=bone['cubes'][0];is_arm='arm' in part;right=part.startswith('right_')
  w=shape['arm'] if is_arm else shape['leg'];d=shape['arm_depth'] if is_arm else shape['leg_depth']
  # Upper arms sit slightly inside the shoulder edge; feet remain on y=0.
  inside=theme['bodyw']/2-.15 if is_arm else shape['gap']/2
  x=-inside-w if right else inside;z=-d/2
  if is_arm:x+=.30 if right else -.30
  knee=theme['elbow'] if is_arm else theme['knee'];top=34 if is_arm else 20;bottom=8 if is_arm else 0
  bone['pivot']=[x+w/2,top,0]
  piece['origin']=[x,knee,z];piece['size']=[w,top-knee,d]
  child={'name':p+part+'_lower','parent':part,'pivot':[bone['pivot'][0],knee,bone['pivot'][2]],'cubes':[c([x,bottom,z],[w,knee-bottom,d])]}
  model['bones'].append(child)
 for parent in ('head','body'):
  for j,cube in enumerate(theme[parent]+SILHOUETTES[index][parent]):
   o=cube['origin'];size=cube['size']
   # Extra torso drapery flexes around its upper attachment, not its lower end.
   hinge_y=o[1]+size[1] if parent=='body' and j>=len(theme[parent]) else o[1]
   model['bones'].append({'name':p+parent+f'_detail_{j}','parent':parent,'pivot':[o[0]+size[0]/2,hinge_y,o[2]+size[2]/2],'cubes':[cube]})
 mapping={name:p+name for name in old}
 for bone in model['bones']:
  if bone['name'] in mapping:bone['name']=mapping[bone['name']]
  if bone.get('parent') in mapping:bone['parent']=mapping[bone['parent']]
 density=next((d for d in range(16,5,-1) if fits(model,d)),None)
 if density is None:raise ValueError(f'traveler {index}: UV overflow')
 source=Image.open(MATERIAL/(theme['mat']+'.png')).convert('RGB');sw,sh=source.size
 atlas=Image.new('RGBA',(SIZE,SIZE),(0,0,0,0));mer=Image.new('RGBA',(SIZE,SIZE),(0,0,185,0));normal=Image.new('RGBA',(SIZE,SIZE),(128,128,255,0));x=y=3;row=0
 for bone in model['bones']:
  name=bone['name'];base_name=name.removeprefix(p);ornament='_detail_' in name
  for ci,cube in enumerate(bone.get('cubes',[])):
   uv={}
   for face,(a,b) in face_sizes(cube).items():
    w=max(5,round(a*density));h=max(5,round(b*density));pad=3
    if x+w+pad>SIZE:x=3;y+=row;row=0
    if y+h+pad>SIZE:raise ValueError(f'traveler {index}: UV overflow')
    uv[face]={'uv':[x,y],'uv_size':[w,h]};rng=random.Random(f'traveler-{index}-{name}-{ci}-{face}')
    cw=min(sw,max(64,w*3));ch=min(sh,max(64,h*3));ox=rng.randrange(sw-cw+1);oy=rng.randrange(sh-ch+1)
    image=source.crop((ox,oy,ox+cw,oy+ch)).resize((w,h),Image.Resampling.LANCZOS)
    image=Image.blend(image,Image.new('RGB',(w,h),theme['chest'] if ornament else theme['dark']),.38)
    image=ImageEnhance.Brightness(image).enhance({'up':1.1,'down':.82,'west':.93,'east':.97,'north':1,'south':.93}[face]).convert('RGBA')
    draw=ImageDraw.Draw(image);col=(*theme['eye'],255)
    # Face is explicitly painted (both +/- z for the front orientation); eyes
    # are high contrast and not inferred by a generic material crop.
    if base_name=='head' and face in ('north','south'):
     draw.rectangle((w*.05,h*.3,w*.95,h*.62),fill=(*theme['dark'],255))
     for cx in (.31,.69):
      ex=w*cx;ey=h*.47;draw.polygon([(ex-w*.1,ey-h*.035),(ex+w*.09,ey-h*.07),(ex+w*.09,ey+h*.05),(ex-w*.1,ey+h*.08)],fill=col)
      draw.line((ex,ey-h*.04,ex,ey+h*.04),fill=(22,20,31,255),width=max(1,w//70))
    if base_name=='body' and ci==0 and face in ('north','south'):
     emblem(draw,index,w,h,col)
     # Body seams differ by region and are subordinate to the main emblem.
     for k in range(1+index%3):
      px=w*(.36+k*.14);draw.line((px,h*.49,px,h*(.78-(k%2)*.08)),fill=(*theme['chest'],255),width=max(1,w//65))
    # Author the emissive mask for eyes and the chest symbol independently;
    # actual PBR rendering and its intensity still need Bedrock verification.
    material=Image.new('RGBA',(w,h),(70 if ornament and index in (4,7) else 0,0,185,255))
    md=ImageDraw.Draw(material);glow=(0,125,185,255)
    if base_name=='head' and face in ('north','south'):
     for cx in (.31,.69):
      ex=w*cx;ey=h*.47;md.polygon([(ex-w*.1,ey-h*.035),(ex+w*.09,ey-h*.07),(ex+w*.09,ey+h*.05),(ex-w*.1,ey+h*.08)],fill=glow)
    if base_name=='body' and ci==0 and face in ('north','south'):emblem(md,index,w,h,glow)
    # Compute local slopes per UV face rather than sampling adjacent faces;
    # neutralize the outermost pixels before adding the texture gutters.
    gray=image.convert('L').filter(ImageFilter.GaussianBlur(.6))
    nr=ImageChops.subtract(ImageChops.offset(gray,1,0),ImageChops.offset(gray,-1,0),scale=5,offset=128)
    ng=ImageChops.subtract(ImageChops.offset(gray,0,1),ImageChops.offset(gray,0,-1),scale=5,offset=128)
    patch=Image.merge('RGBA',(nr,ng,Image.new('L',(w,h),252),Image.new('L',(w,h),255)))
    pd=ImageDraw.Draw(patch);pd.rectangle((0,0,w-1,h-1),outline=(128,128,252,255),width=1)
    paste_with_gutter(atlas,image,x,y);paste_with_gutter(mer,material,x,y);paste_with_gutter(normal,patch,x,y)
    x+=w+pad;row=max(row,h+pad)
   cube['uv']=uv
 stem=f'hakkai_ender_r{index}'
 return {RP/f'models/entity/ender_{index}.geo.json':(json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode(),
  RP/f'textures/entity/{stem}.png':bytes_png(atlas),RP/f'textures/entity/{stem}_mer.png':bytes_png(mer),RP/f'textures/entity/{stem}_n.png':bytes_png(normal)}

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--write',action='store_true');parser.add_argument('--check',action='store_true');args=parser.parse_args()
 if args.write==args.check:parser.error('choose exactly one of --write or --check')
 for i in range(8):
  for path,data in build(i).items():
   if args.write:path.write_bytes(data)
   elif not path.exists() or path.read_bytes()!=data:raise SystemExit(f'Traveler appearance stale: {path}')
 print('Eight realm-traveler appearance prototypes: 32 files '+('written' if args.write else 'verified'))
if __name__=='__main__':main()
