"""Static UV and rig checks for 12 prototypes; no engine or art-quality claim."""
import hashlib,json,subprocess,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];rp=root/'Hakkai_v7.1.0/ResourcePack'
subprocess.run([sys.executable,str(root/'tools/build_grassland_foe_art.py'),'--check'],cwd=root,check=True)
subprocess.run([sys.executable,str(root/'tools/sync_grassland_foe_visuals.py'),'--check'],cwd=root,check=True)
anims=json.loads((rp/'animations/grassland_foe_individual.animation.json').read_text())['animations'];assert len(anims)==48
hashes=set();rigs=[]
for i in range(12):
 ident=f'foe_0_{i}';prefix=f'f0_{i}_'
 model=json.loads((rp/f'models/entity/{ident}.geo.json').read_text())['minecraft:geometry'][0];d=model['description']
 assert d['identifier']==f'geometry.hakkai.{ident}' and (d['texture_width'],d['texture_height'])==(1024,1024)
 bones={b['name']:b for b in model['bones']};assert len(bones)==len(model['bones']) and all(n.startswith(prefix) for n in bones)
 assert all(b.get('parent') in bones for b in model['bones'] if b.get('parent'));rigs.append(set(bones))
 assert prefix+'body' in bones and prefix+'head' in bones
 assert any('_head_detail_' in n for n in bones) and any('_body_detail_' in n for n in bones)
 if i in (4,11):
  for side in ('l','r'):assert prefix+'wing_'+side in bones and bones[prefix+'wing_'+side]['parent']==prefix+'body'
 if i in (0,8):
  assert all(bones[prefix+f'shin_{j}']['parent']==prefix+f'leg_{j}' for j in range(4))
  assert (bones[prefix+'body']['cubes'][0]['size'][0] < 6) == (i==0)
 if i in (5,9):
  assert all(bones[prefix+f'wing_{side}_tip']['parent']==prefix+f'wing_{side}' for side in ('l','r'))
  assert (bones[prefix+'wing_l']['cubes'][0]['size'][0] > 4) == (i==5)
 client=json.loads((rp/f'entity/{ident}.entity.json').read_text())['minecraft:client_entity']['description']
 assert client['geometry']['default']==d['identifier'] and client['textures']['default']==f'textures/entity/{ident}'
 for label in ('walk','windup','strike'):
  aid=f'animation.hakkai.{ident}_{label}';alias='walk' if label=='walk' else 'talent_'+label
  assert client['animations'][alias]==aid and set(anims[aid]['bones'])<=bones.keys()
  if label!='walk':assert client['animations']['creature_'+label]==aid and anims[aid]['animation_length']==(1.9 if label=='windup' else .38)
 if i in (4,11):assert {prefix+'wing_l',prefix+'wing_r'}<=anims[f'animation.hakkai.{ident}_walk']['bones'].keys()
 if i==3:assert all(prefix+f'leg_{j}' in anims[f'animation.hakkai.{ident}_strike']['bones'] for j in range(6))
 texset=json.loads((rp/f'textures/entity/{ident}.texture_set.json').read_text())['minecraft:texture_set']
 assert texset['color']==ident and texset['normal']==ident+'_n' and texset['metalness_emissive_roughness']==ident+'_mer'
 imgs=[Image.open(rp/f'textures/entity/{ident}{suffix}.png').convert('RGBA') for suffix in ('','_n','_mer')]
 assert all(im.size==(1024,1024) for im in imgs);alpha=[im.getchannel('A') for im in imgs]
 assert alpha[0].tobytes()==alpha[1].tobytes()==alpha[2].tobytes()
 if i==5:
  flower=bones[prefix+'body_detail_0']['cubes']
  assert len(flower)==8
  colors=[]
  for cube in flower[3:]:
   uv=cube['uv']['up'];x,y=uv['uv'];w,h=uv['uv_size'];colors.append(imgs[0].getpixel((x+w//2,y+h//2)))
  assert all(r>g and r>b for r,g,b,a in colors[:4]),(ident,'petals')
  r,g,b,a=colors[4];assert r>180 and g>150 and b<140,(ident,'pollen')
 if i==9:
  lantern=bones[prefix+'body_detail_0']['cubes'][1]['uv']['up'];x,y=lantern['uv'];w,h=lantern['uv_size']
  r,g,b,a=imgs[0].getpixel((x+w//2,y+h//2));assert r>200 and g>150 and b<160,(ident,'lantern')
 if i in (3,6):
  for j in range(6 if i==3 else 8):
   leg=bones[prefix+f'leg_{j}']['cubes']
   assert len(leg)==3 and leg[1]['origin'][1]==0 and leg[1]['size'][1]>2
   assert leg[2]['origin'][1]==0 and leg[2]['size'][1]<1
 if i==7:
  head=bones[prefix+'head']['cubes']
  assert head[2]['size'][1]==head[3]['size'][1]==3.5
  assert head[4]['origin'][1]<9 and head[4]['size'][1]<1
 if i==10:
  for side in ('l','r'):
   blade=bones[prefix+f'arm_{side}_detail_blade']
   forearm=bones[prefix+f'forearm_{side}']
   assert forearm['parent']==prefix+f'arm_{side}' and blade['parent']==forearm['name']
   assert len(blade['cubes'])==3 and len(forearm['cubes'])==1
  assert bones[prefix+'body_detail_ridge']['parent']==prefix+'body'
 if i in (1,2,10):
  face=bones[prefix+'head']['cubes'][0]['uv']['north'];x,y=face['uv'];w,h=face['uv_size']
  for fx in (.28,.72):
   # The frontal eye centre is a dark pupil, surrounded by the accent iris.
   px,py=x+int(w*fx),y+int(h*.25)
   assert imgs[0].getpixel((px,py))==(22,20,22,255),(ident,'front pupil')
 rects=[]
 for bone in model['bones']:
  for cube in bone.get('cubes',[]):
   assert set(cube['uv'])=={'north','south','east','west','up','down'}
   for face in cube['uv'].values():
    x,y=face['uv'];w,h=face['uv_size'];assert 1<=x<x+w<1024 and 1<=y<y+h<1024
    for xx,yy,ww,hh in rects:assert x+w<=xx or xx+ww<=x or y+h<=yy or yy+hh<=y,(ident,face)
    rects.append((x,y,w,h))
    for a in alpha:assert a.crop((x-1,y-1,x+w+1,y+h+1)).getextrema()==(255,255)
    normal=imgs[1]
    assert all(normal.getpixel((xx,y))==(128,128,252,255) and normal.getpixel((xx,y+h-1))==(128,128,252,255) for xx in range(x,x+w)),(ident,'normal top/bottom')
    assert all(normal.getpixel((x,yy))==(128,128,252,255) and normal.getpixel((x+w-1,yy))==(128,128,252,255) for yy in range(y,y+h)),(ident,'normal sides')
 assert alpha[0].histogram()[255]>100000 and len(imgs[0].convert('RGB').getcolors(1024*1024))>1000
 hashes.add(hashlib.sha256(imgs[0].tobytes()).digest())
assert len(hashes)==12
for i in range(12):
 for j in range(i):assert rigs[i].isdisjoint(rigs[j])
print('Grassland foes: 12 individual rigs, 48 animation references, UV bounds and 1024px maps OK (static only)')
