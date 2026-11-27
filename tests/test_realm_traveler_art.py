"""Static asset, UV and rig coverage for the eight realm travelers, not a render test."""
import json,subprocess,sys,tempfile,shutil
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];rp=root/'Hakkai_v7.1.0/ResourcePack'
sys.path.insert(0,str(root/'tools'))
from build_realm_traveler_art import DESIGNS,SILHOUETTES,BUILD_PROPORTIONS,MATERIAL,build
subprocess.run([sys.executable,str(root/'tools/build_realm_traveler_art.py'),'--check'],cwd=root,check=True)
subprocess.run([sys.executable,str(root/'tools/sync_realm_traveler_visuals.py'),'--check'],cwd=root,check=True)
anims=json.loads((rp/'animations/realm_traveler_individual.animation.json').read_text())['animations'];assert len(anims)==32
base=json.loads((root/'tools/art_templates/mob_baselines/realm_ender.geo.json').read_text())['minecraft:geometry'][0]
old={b['name']:b for b in base['bones']};bone_sets=[];body_widths=set();pixels=set();shapes=set()
assert [d['mat'] for d in DESIGNS]==['wind','mist','desert','frost','thunder','abyss','sky','time']
assert len({(MATERIAL/(d['mat']+'.png')).read_bytes() for d in DESIGNS})==8
for i in range(8):
 ident=f'ender_{i}';prefix=f'e{i}_';stem=f'hakkai_ender_r{i}'
 model=json.loads((rp/f'models/entity/{ident}.geo.json').read_text())['minecraft:geometry'][0];description=model['description']
 assert description['identifier']==f'geometry.hakkai.{ident}' and (description['texture_width'],description['texture_height'])==(1024,1024)
 bones={b['name']:b for b in model['bones']};assert len(bones)==len(model['bones']);assert all(n.startswith(prefix) for n in bones)
 assert all(b.get('parent') in bones for b in model['bones'] if b.get('parent'))
 for key in old:
  if key in ('head','body'):assert bones[prefix+key]['pivot']==old[key]['pivot']
  assert bones[prefix+key].get('parent') is None
 assert len(bones)>=16;bone_sets.append(set(bones));body_widths.add(bones[prefix+'body']['cubes'][0]['size'][0])
 shape=BUILD_PROPORTIONS[i];torso=bones[prefix+'body']['cubes'];assert len(torso)==2
 assert torso[0]['size']==[DESIGNS[i]['bodyw'],12,shape['depth']]
 assert torso[1]['size']==[shape['waist'],4,shape['depth']*.9]
 assert torso[0]['origin'][1]==torso[1]['origin'][1]+torso[1]['size'][1]
 shapes.add((shape['waist'],shape['depth'],shape['arm'],shape['leg']))
 for limb in ('right_arm','left_arm','right_leg','left_leg'):
  upper=bones[prefix+limb];lower=bones[prefix+limb+'_lower'];assert lower['parent']==prefix+limb
  u=upper['cubes'][0];v=lower['cubes'][0];assert u['origin'][1]==v['origin'][1]+v['size'][1]
  assert u['origin'][0]==v['origin'][0] and u['origin'][2]==v['origin'][2]
  assert u['size'][0]==v['size'][0]==shape['arm' if 'arm' in limb else 'leg']
  assert u['size'][2]==v['size'][2]==shape['arm_depth' if 'arm' in limb else 'leg_depth']
  assert abs(upper['pivot'][0]-(u['origin'][0]+u['size'][0]/2))<1e-8
  assert upper['pivot'][1]==(34 if 'arm' in limb else 20)
  assert lower['pivot']==[upper['pivot'][0],u['origin'][1],0]
  assert v['origin'][1]==(8 if 'arm' in limb else 0)
  if 'arm' in limb:
   # Upper arms overlap the torso at the neutral pose, not float beside it.
   assert max(u['origin'][0],torso[0]['origin'][0])<min(u['origin'][0]+u['size'][0],torso[0]['origin'][0]+torso[0]['size'][0])
  else:
   # Hips sit under the waist and feet remain on the ground plane.
   assert max(u['origin'][0],torso[1]['origin'][0])<min(u['origin'][0]+u['size'][0],torso[1]['origin'][0]+torso[1]['size'][0])
 if i==4:
  # The chest emblem occupies this projected central back rectangle. No
  # protruding decorative cube should cover it in the neutral pose.
  top=torso[0];half=top['size'][0]*.18;cy=top['origin'][1]+top['size'][1]*.70;dy=top['size'][1]*.095
  for b in model['bones']:
   if b['name']==prefix+'body':continue
   for c in b.get('cubes',[]):
    o=c['origin'];sz=c['size']
    overlap_x=max(o[0],-half)<min(o[0]+sz[0],half)
    overlap_y=max(o[1],cy-dy)<min(o[1]+sz[1],cy+dy)
    assert not (overlap_x and overlap_y and o[2]+sz[2]>top['origin'][2]+top['size'][2]),b['name']
  # Shoulder faces must sit in front of, not coplanar with, the torso face.
  for n in (0,1):assert bones[f'e4_body_detail_{n}']['cubes'][0]['origin'][2]<top['origin'][2]
 assert len([k for k in bones if '_head_detail_' in k])>=3 and len([k for k in bones if '_body_detail_' in k])>=3
 for parent in ('head','body'):
  for j,cube in enumerate(SILHOUETTES[i][parent],start=len(DESIGNS[i][parent])):
   b=bones[prefix+parent+f'_detail_{j}'];assert b['parent']==prefix+parent
   assert b['cubes'][0]['origin']==cube['origin'] and b['cubes'][0]['size']==cube['size']
 client=json.loads((rp/f'entity/{ident}.entity.json').read_text())['minecraft:client_entity']['description']
 assert client['geometry']['default']==description['identifier'] and client['textures']['default']==f'textures/entity/{stem}'
 for label,alias in [('walk','walk'),('windup','creature_windup'),('strike','creature_strike'),('detail','traveler_detail')]:
  aid=f'animation.hakkai.{ident}_{label}';assert client['animations'][alias]==aid and set(anims[aid]['bones'])<=bones.keys()
 assert client['scripts']['animate'].count('traveler_detail')==1
 for limb in ('right_arm','left_arm','right_leg','left_leg'):assert prefix+limb+'_lower' in anims[f'animation.hakkai.{ident}_detail']['bones']
 texset=json.loads((rp/f'textures/entity/{stem}.texture_set.json').read_text())['minecraft:texture_set']
 assert texset['color']==stem and texset['normal']==stem+'_n' and texset['metalness_emissive_roughness']==stem+'_mer'
 imgs=[Image.open(rp/f'textures/entity/{stem}{suffix}.png').convert('RGBA') for suffix in ('','_n','_mer')]
 assert all(im.size==(1024,1024) for im in imgs)
 assert imgs[2].getchannel('G').getextrema()[1]==125  # authored emissive mask, not proof of PBR
 # Broad eyes are painted only on the north/front head face. Texture-space
 # assertions do not prove the engine's UV orientation or emission rendering.
 head=bones[prefix+'head']['cubes'][0]
 for face in ('north','south'):
  x,y=head['uv'][face]['uv'];w,h=head['uv'][face]['uv_size']
  for cx in (.29,.71):
   pos=(x+int(w*cx),y+int(h*.46))
   if face=='north':assert sum(imgs[0].getpixel(pos)[:3])>450 and imgs[2].getpixel(pos)[1]==125
   else:assert imgs[2].getpixel(pos)[1]==0
 alpha=[im.getchannel('A') for im in imgs];assert alpha[0].tobytes()==alpha[1].tobytes()==alpha[2].tobytes()
 rects=[]
 for bone in model['bones']:
  for cube in bone.get('cubes',[]):
   assert set(cube['uv'])=={'north','south','east','west','up','down'}
   for face in cube['uv'].values():
    x,y=face['uv'];w,h=face['uv_size'];assert 1<=x<x+w<1024 and 1<=y<y+h<1024
    for xx,yy,ww,hh in rects:assert x+w<=xx or xx+ww<=x or y+h<=yy or yy+hh<=y,(ident,face)
    rects.append((x,y,w,h))
    for a in alpha:assert a.crop((x-1,y-1,x+w+1,y+h+1)).getextrema()==(255,255)
 assert alpha[0].histogram()[255]>100000
 assert len(imgs[0].convert('RGB').getcolors(1024*1024))>1000
 pixels.add(imgs[0].tobytes())
assert len(body_widths)==8 and len(pixels)==8 and len(shapes)==8
for i in range(8):
 for j in range(i):assert bone_sets[i].isdisjoint(bone_sets[j])
# The visual generator's output allowlist never includes behavior/protected rigs.
paths=build(4)
assert len(paths)==4 and all(p.is_relative_to(rp) for p in paths)
assert all('ender_4.geo.json' in str(p) or 'hakkai_ender_r4' in str(p) for p in paths)
# Test the destructive legacy generator refuses to run in this tree before it
# reaches any write; the intentional override is never executed by the test.
p=subprocess.run([sys.executable,str(root/'tools/create_realm_endermen.py')],cwd=root,text=True,capture_output=True)
assert p.returncode!=0 and 'Refusing to overwrite individual realm travelers' in p.stderr
print('Travelers: 8 unique rig hierarchies, 32 animation refs, face UVs, alpha gutters, material maps and legacy overwrite protection OK (static only)')
