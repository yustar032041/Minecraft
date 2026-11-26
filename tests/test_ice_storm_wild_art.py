"""Check six bespoke rig assets; not engine or visual-quality validation."""
import hashlib,json,subprocess,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];rp=root/'Hakkai_v7.1.0/ResourcePack'
for tool in ('build_ice_storm_wild_art.py','sync_ice_storm_wild_visuals.py'):
 subprocess.run([sys.executable,str(root/'tools'/tool),'--check'],cwd=root,check=True)
anims=json.loads((rp/'animations/ice_storm_wild_individual.animation.json').read_text())['animations'];assert len(anims)==22
rigs=[];hashes=set()
for realm in (3,4):
 for i in range(3):
  name=f'wild_{realm}_{i}';prefix=f'w{realm}_{i}_';model=json.loads((rp/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0];d=model['description']
  assert d['identifier']==f'geometry.hakkai.{name}' and (d['texture_width'],d['texture_height'])==(1024,1024)
  bones={b['name']:b for b in model['bones']};assert len(bones)==len(model['bones']) and all(b.startswith(prefix) for b in bones)
  assert all(b.get('parent') in bones for b in bones.values() if b.get('parent'));rigs.append(set(bones))
  assert prefix+'body' in bones and prefix+'head' in bones
  if (realm,i)==(3,0):assert bones[prefix+'tail_plume']['parent']==prefix+'tail'
  if (realm,i)==(3,1):
   assert all(bones[prefix+f'antler_{s}']['parent']==prefix+'head' for s in ('l','r'))
   assert all(bones[prefix+f'shin_{j}']['parent']==prefix+f'leg_{j}' for j in range(4))
  if (realm,i)==(3,2):assert all(bones[prefix+f'paw_{j}']['parent']==prefix+f'leg_{j}' for j in range(4))
  if (realm,i)==(4,0):assert all(bones[prefix+f'wing_{s}_tip']['parent']==prefix+f'wing_{s}' for s in ('l','r'))
  if (realm,i)==(4,1):assert all(bones[prefix+f'horn_{s}']['parent']==prefix+'head' for s in ('l','r'))
  if (realm,i)==(4,2):assert all(bones[prefix+f'fist_{s}']['parent']==prefix+f'arm_{s}' for s in ('l','r'))
  client=json.loads((rp/f'entity/{name}.entity.json').read_text())['minecraft:client_entity']['description']
  assert client['geometry']['default']==d['identifier'] and client['textures']['default']==f'textures/entity/{name}'
  for label in ('walk','windup','strike'):
   aid=f'animation.hakkai.{name}_{label}';alias='walk' if label=='walk' else 'creature_'+label
   assert client['animations'][alias]==aid and set(anims[aid]['bones'])<=bones.keys()
   if label!='walk':assert anims[aid]['animation_length']==(1.9 if label=='windup' else .38)
   if i==2 and label!='walk':assert client['animations']['talent_'+label]==aid
  ts=json.loads((rp/f'textures/entity/{name}.texture_set.json').read_text())['minecraft:texture_set']
  assert ts['color']==name and ts['normal']==name+'_n' and ts['metalness_emissive_roughness']==name+'_mer'
  imgs=[Image.open(rp/f'textures/entity/{name}{suffix}.png').convert('RGBA') for suffix in ('','_n','_mer')]
  assert all(im.size==(1024,1024) for im in imgs)
  alpha=[im.getchannel('A') for im in imgs];assert alpha[0].tobytes()==alpha[1].tobytes()==alpha[2].tobytes()
  rects=[]
  for bone in model['bones']:
   for cube in bone.get('cubes',[]):
    assert 'material' not in cube and set(cube['uv'])=={'north','south','east','west','up','down'}
    for face in cube['uv'].values():
     x,y=face['uv'];w,h=face['uv_size'];assert 1<=x<x+w<1024 and 1<=y<y+h<1024
     assert all(x+w<=xx or xx+ww<=x or y+h<=yy or yy+hh<=y for xx,yy,ww,hh in rects),(name,face)
     rects.append((x,y,w,h))
     for a in alpha:assert a.crop((x-1,y-1,x+w+1,y+h+1)).getextrema()==(255,255)
  hashes.add(hashlib.sha256(imgs[0].tobytes()).digest())
assert len(hashes)==6 and all(rigs[i].isdisjoint(rigs[j]) for i in range(6) for j in range(i))
print('Ice/storm wildlife: six rigs, 22 animations, UV and 1024px maps OK (static only)')
