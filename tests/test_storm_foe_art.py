"""Storm foe reproducibility, rigs, UV and animation checks, not Bedrock quality validation."""
import hashlib,json,subprocess,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];rp=root/'Hakkai_v7.1.0/ResourcePack'
for tool in ('build_storm_foe_art.py','sync_storm_foe_visuals.py'):
 subprocess.run([sys.executable,str(root/'tools'/tool),'--check'],cwd=root,check=True)
anims=json.loads((rp/'animations/storm_foe_individual.animation.json').read_text())['animations'];assert len(anims)==48
rigs=[];hashes=set();shapes=set()
for i in range(12):
 name=f'foe_4_{i}';prefix=f'f4_{i}_';model=json.loads((rp/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0];d=model['description']
 assert d['identifier']==f'geometry.hakkai.{name}' and (d['texture_width'],d['texture_height'])==(1024,1024)
 bones={b['name']:b for b in model['bones']};assert len(bones)==len(model['bones']) and all(b.startswith(prefix) for b in bones)
 assert all(b.get('parent') in bones for b in bones.values() if b.get('parent'));rigs.append(set(bones))
 shapes.add(json.dumps([[b['name'].removeprefix(prefix), b.get('parent','').removeprefix(prefix), [(c['origin'],c['size']) for c in b.get('cubes',[])]] for b in model['bones']]))
 assert prefix+'body' in bones and prefix+'head' in bones
 if i in (1,5,9,11):assert all(bones[prefix+f'wing_{side}_tip']['parent']==prefix+f'wing_{side}' for side in ('l','r'))
 if i in (0,2):assert all(bones[prefix+f'fist_{side}']['parent']==prefix+f'arm_{side}' for side in ('l','r'))
 if i==0:assert bones[prefix+'back_pylon']['parent']==prefix+'body'
 if i==3:
  assert all(bones[prefix+f'foot_{n}']['parent']==prefix+f'leg_{n}' for n in range(6))
  assert all(bones[prefix+f'shell_{side}']['parent']==prefix+'body' for side in ('l','r'))
 if i==4:assert all(bones[prefix+f'paw_{n}']['parent']==prefix+f'leg_{n}' for n in range(4))
 if i==5:assert bones[prefix+'coil']['parent']==prefix+'body'
 if i==6:assert all(bones[prefix+f'leg_tip_{n}']['parent']==prefix+f'leg_{n}' for n in range(8))
 if i==7:assert all(bones[prefix+f'ear_{side}']['parent']==prefix+'head' for side in ('l','r'))
 if i==8:
  assert all(bones[prefix+f'horn_{side}']['parent']==prefix+'head' for side in ('l','r'))
  assert all(bones[prefix+f'forearm_{side}']['parent']==prefix+f'arm_{side}' for side in ('l','r'))
 if i==10:
  assert bones[prefix+'shield']['parent']==prefix+'body' and bones[prefix+'battlement']['parent']==prefix+'head'
  assert all(prefix+f'arm_{side}' in bones for side in ('l','r')) and prefix+'leg_2' not in bones
 if i==11:
  assert all(prefix+f'leg_{n}' in bones for n in range(4)) and bones[prefix+'needle']['parent']==prefix+'body'
 # The small front emblem must protrude beyond any overlapping solid face.
 # This checks unrotated coordinates only, not actual Bedrock rasterization.
 if i in (0,2,8,10):
  emblem_bone='shield' if i==10 else 'body'
  emblem=bones[prefix+emblem_bone]['cubes'][2]
  for bone in bones.values():
   for cube in bone.get('cubes',[]):
    if cube is emblem:continue
    overlap=all(emblem['origin'][axis]<cube['origin'][axis]+cube['size'][axis] and cube['origin'][axis]<emblem['origin'][axis]+emblem['size'][axis] for axis in (0,1))
    if overlap:assert cube['origin'][2]>=emblem['origin'][2],(name,emblem_bone,bone['name'])
 client=json.loads((rp/f'entity/{name}.entity.json').read_text())['minecraft:client_entity']['description']
 assert client['geometry']['default']==d['identifier'] and client['textures']['default']==f'textures/entity/{name}'
 for label in ('walk','windup','strike'):
  aid=f'animation.hakkai.{name}_{label}';alias='walk' if label=='walk' else 'creature_'+label
  assert client['animations'][alias]==aid and set(anims[aid]['bones'])<=bones.keys()
  if label!='walk':assert anims[aid]['animation_length']==(1.9 if label=='windup' else .38)
  if label!='walk':assert client['animations']['talent_'+label]==aid
 if i==11:assert all(prefix+f'leg_{n}' in anims[f'animation.hakkai.{name}_walk']['bones'] for n in range(4))
 ts=json.loads((rp/f'textures/entity/{name}.texture_set.json').read_text())['minecraft:texture_set']
 assert ts['color']==name and ts['normal']==name+'_n' and ts['metalness_emissive_roughness']==name+'_mer'
 imgs=[Image.open(rp/f'textures/entity/{name}{suffix}.png').convert('RGBA') for suffix in ('','_n','_mer')]
 assert all(im.size==(1024,1024) for im in imgs)
 assert imgs[2].getchannel('G').getextrema()==(0,0)
 assert imgs[2].getchannel('R').getextrema()==((0,140) if i in (1,3,5,8,10) else (0,0))
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
assert len(shapes)==12 and len(hashes)==12 and all(rigs[i].isdisjoint(rigs[j]) for i in range(12) for j in range(i))
print('Storm foe: twelve bespoke rigs, 48 animation references and 1024px per-face maps OK (static only)')
