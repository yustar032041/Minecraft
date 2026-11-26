"""Reproducibility and wiring checks for all worn armor, not a visual proof."""
import json,sys,collections,tempfile
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from build_icon_matched_armor import wearable_items,render_texture,texture_maps,geometry,extend_material,turnaround,assembled_turnaround,RP,EQ,SLOTS
items=wearable_items();assert len(items)==106
assert collections.Counter(part for _,part,_ in items)=={'chest':40,'helmet':22,'leggings':22,'boots':22}
model=json.loads((RP/'models/entity/hakkai_icon_armor.geo.json').read_text())['minecraft:geometry']
assert model==[geometry(part) for part in SLOTS.values()]
# Raised north faces should be subregions of the inflated base UV, so raised
# plates do not duplicate or displace an emblem. Orthographic only.
def aligned(base,plate):
 bu,bv=base['uv']['north']['uv'];bw,bh=base['uv']['north']['uv_size'];u,v=plate['uv']['north']['uv'];w,h=plate['uv']['north']['uv_size']
 x,y,_=base['origin'];sx,sy,_=base['size'];inflate=base.get('inflate',0);px,py,_=plate['origin'];pw,ph,_=plate['size']
 expected=[bu+(x+sx+inflate-px-pw)/(sx+2*inflate)*bw,bv+(y+sy+inflate-py-ph)/(sy+2*inflate)*bh,pw/(sx+2*inflate)*bw,ph/(sy+2*inflate)*bh]
 assert all(abs(a-b)<1e-9 for a,b in zip((u,v,w,h),expected))
for g in model:
 part=g['description']['identifier'].rsplit('_',1)[-1]
 for bone in g['bones']:
  cubes=bone.get('cubes',[])
  if not cubes:continue
  indexes=({'helmet':{'head':[1,2]},'chest':{'body':[1,2,3]},'leggings':{'body':[1],'rightLeg':[1,2],'leftLeg':[1,2]},'boots':{'rightLeg':[2,3],'leftLeg':[2,3]}}[part]).get(bone['name'],[])
  for i in indexes:aligned(cubes[0],cubes[i])
  if part=='boots' and bone['name'] in ('leftLeg','rightLeg'):
   assert cubes[0]['size']==[4,5.7,4] and cubes[1]['origin'][2]<cubes[0]['origin'][2]
  if part=='chest' and bone['name'] in ('leftArm','rightArm'):
   arm=cubes[0];assert arm['origin'][1]==18.3 and arm['size'][1]==5.7
   u,v=arm['uv']['north']['uv'];w,h=arm['uv']['north']['uv_size']
   assert v==24 and h==9 and w==8 and u in (0,8)
# Transparent margins are extended from actual solid pixels, not replaced by a
# separate flat placeholder or RGB hidden underneath transparency.
synthetic=Image.new('RGBA',(5,5),(255,0,255,0));synthetic.putpixel((2,2),(15,90,145,255))
assert set(extend_material(synthetic).getdata())=={(15,90,145,255)}
# Adjacent front/back UV islands may have very different brightness. Their
# edges must not turn into artificial normal-map ridges from the neighbor.
# This does not test Bedrock's tangent conventions or actual PBR rendering.
from PIL import ImageDraw
for size in (128,256):
 scale=size//64
 synthetic=Image.new('RGBA',(size,size),(30,30,30,255))
 ImageDraw.Draw(synthetic).rectangle((16*scale,0,32*scale-1,24*scale-1),fill=(240,240,240,255))
 normal,_=texture_maps(synthetic)
 for x in (16*scale-1,16*scale):
  assert normal.getpixel((x,12*scale))==(128,128,255,255),(size,x,normal.getpixel((x,12*scale)))
 # Preserve a real gradient well inside the front island; only the seam is
 # isolated. The old whole-image normal and new crop agree in the interior.
 from create_series_armor import normals
 gradient=Image.new('RGBA',(size,size),(30,30,30,255))
 pixels=gradient.load()
 for y in range(24*scale):
  for x in range(16*scale):pixels[x,y]=(min(255,x*3),)*3+(255,)
 old=normals(gradient);new,_=texture_maps(gradient)
 for y in range(5*scale,19*scale):
  for x in range(5*scale,11*scale):assert old.getpixel((x,y))==new.getpixel((x,y))
 # The top and detail islands share a horizontal edge too.
 synthetic=Image.new('RGBA',(size,size),(30,30,30,255))
 ImageDraw.Draw(synthetic).rectangle((40*scale,8*scale,56*scale-1,24*scale-1),fill=(240,240,240,255))
 normal,_=texture_maps(synthetic)
 for y in (8*scale-1,8*scale):assert normal.getpixel((44*scale,y))==(128,128,255,255)

# A diagnostic color band below the knee must reach both lower leg UVs; the
# old y=76 crop omitted it entirely. This is a mapping test, not visual QA.
with tempfile.TemporaryDirectory() as directory:
 from PIL import ImageDraw
 source=Image.new('RGBA',(128,128),(90,90,90,255))
 ImageDraw.Draw(source).rectangle((32,78,96,101),fill=(20,30,230,255))
 path=Path(directory)/'bands.png';source.save(path)
 texture=render_texture(path,'leggings',128)
 for x in (8,24):
  r,g,b,a=texture.getpixel((x,92));assert b>180 and b>r*3 and a==255
 # Chest level badges live in the lower-right corner of some inventory icons.
 # Changing that badge must not paint a numeral onto the worn breastplate.
 original=Image.open(root/'Hakkai_v7.1.0/ResourcePack/textures/items/hakkai_gear_196.png').convert('RGBA')
 source=Path(directory)/'chest.png';original.save(source)
 front=render_texture(source,'chest',128).crop((0,0,32,48))
 ImageDraw.Draw(original).rectangle((92,102,127,127),fill=(255,0,255,255));original.save(source)
 assert front.tobytes()==render_texture(source,'chest',128).crop((0,0,32,48)).tobytes()
offsets={'helmet':'helmet','chest':'chestplate','leggings':'leggings','boots':'boots'}
for name,part,icon in items:
 desc=json.loads((RP/'attachables'/f'{name}.json').read_text())['minecraft:attachable']['description']
 assert desc['geometry']['default']=='geometry.hakkai.icon_armor_'+part
 assert desc['materials']=={'default':'armor','enchanted':'armor_enchanted'}
 assert desc['textures']['enchanted']=='textures/misc/enchanted_actor_glint'
 assert desc['render_controllers']==['controller.render.armor']
 assert 'offset' in desc['scripts']['animate'] and desc['animations']['offset']==f'animation.armor.{offsets[part]}.offset'
 image=Image.open(EQ/f'{name}.png').convert('RGBA');size=256 if name.startswith('ult_') else 128
 assert image.size==(size,size)
 assert image.tobytes()==render_texture(icon,part,size).tobytes(),name
 # Rear is mirrored material from an emblem-free strip, not a second copy of
 # the front picture. This checks construction, not actual appearance.
 s=size//64;front=image.crop((0,0,16*s,24*s));back=image.crop((16*s,0,32*s,24*s))
 assert back.tobytes()!=front.tobytes(),name
 assert back.crop((0,0,8*s,24*s)).transpose(Image.Transpose.FLIP_LEFT_RIGHT).tobytes()==back.crop((8*s,0,16*s,24*s)).tobytes(),name
 if part=='helmet':assert front.crop((0,0,8*s,24*s)).transpose(Image.Transpose.FLIP_LEFT_RIGHT).tobytes()==front.crop((8*s,0,16*s,24*s)).tobytes(),name
 for suffix,expected in zip(('_n','_mer'),texture_maps(image)):
  actual=Image.open(EQ/f'{name}{suffix}.png').convert('RGBA')
  assert actual.size==image.size and actual.tobytes()==expected.tobytes(),(name,suffix)
 texture_set=json.loads((EQ/f'{name}.texture_set.json').read_text())['minecraft:texture_set']
 assert texture_set=={'color':name,'normal':name+'_n','metalness_emissive_roughness':name+'_mer'}
for part in ('helmet','chest','leggings','boots'):
 image=Image.open(EQ/f'ult_{part}.png').convert('RGBA')
 expected=turnaround(image,part)
 stored=Image.open(root/f'art_sources/armor_wear_previews/ult_{part}_turn.png').convert('RGB')
 assert expected.tobytes()==stored.tobytes(),part
for label,names in [('series_00',('gear_011','gear_010','series_leggings_00','gear_012')),('ultimate',('ult_helmet','ult_chest','ult_leggings','ult_boots'))]:
 images={part:Image.open(EQ/f'{name}.png').convert('RGBA') for part,name in zip(('helmet','chest','leggings','boots'),names)}
 expected=assembled_turnaround(images);stored=Image.open(root/f'art_sources/armor_wear_previews/{label}_assembled.png').convert('RGB')
 assert expected.tobytes()==stored.tobytes(),label
print('106 icon-derived armor visuals, aligned relief and UV/offset/material wiring match their generator (static only)')
