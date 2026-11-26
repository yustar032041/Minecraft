"""Forest foe reproducibility, rigs, UV and animation checks, not Bedrock quality validation."""
import hashlib,json,subprocess,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];rp=root/'Hakkai_v7.1.0/ResourcePack'
for tool in ('build_forest_foe_individual_art.py','build_forest_foe_more_art.py','sync_forest_foe_individual_visuals.py'):
 subprocess.run([sys.executable,str(root/'tools'/tool),'--check'],cwd=root,check=True)
anims=json.loads((rp/'animations/forest_foe_individual.animation.json').read_text())['animations'];assert len(anims)==48
rigs=[];hashes=set()
for i in range(12):
 name=f'foe_1_{i}';prefix=f'f1_{i}_';model=json.loads((rp/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0];d=model['description']
 assert d['identifier']==f'geometry.hakkai.{name}' and (d['texture_width'],d['texture_height'])==(1024,1024)
 bones={b['name']:b for b in model['bones']};assert len(bones)==len(model['bones']) and all(b.startswith(prefix) for b in bones)
 assert all(b.get('parent') in bones for b in bones.values() if b.get('parent'));rigs.append(set(bones))
 assert prefix+'body' in bones and prefix+'head' in bones
 if i==0:
  assert bones[prefix+'tail_fan']['parent']==prefix+'tail' and bones[prefix+'ruff']['parent']==prefix+'body'
 if i==1:
  assert all(bones[prefix+f'wing_{side}_tip']['parent']==prefix+f'wing_{side}' for side in ('l','r'))
 if i==2:
  assert all(bones[prefix+f'forearm_{side}']['parent']==prefix+f'arm_{side}' for side in ('l','r'))
  assert all(bones[prefix+f'horn_{side}']['parent']==prefix+'head' for side in ('l','r'))
 if i==3:
  assert all(bones[prefix+f'shell_{side}']['parent']==prefix+'body' for side in ('l','r'))
  assert all(prefix+f'leg_{n}' in bones for n in range(6))
 if i==4:
  assert bones[prefix+'tail_mid']['parent']==prefix+'tail' and bones[prefix+'tail_tip']['parent']==prefix+'tail_mid'
 if i==5:
  assert all(bones[prefix+f'wing_{side}_tip']['parent']==prefix+f'wing_{side}' for side in ('l','r'))
 if i==6:
  assert all(bones[prefix+f'leg_tip_{n}']['parent']==prefix+f'leg_{n}' for n in range(8))
 if i==7:
  assert all(bones[prefix+f'ear_{side}']['parent']==prefix+'head' for side in ('l','r'))
 if i==8:
  assert all(bones[prefix+f'forearm_{side}']['parent']==prefix+f'arm_{side}' for side in ('l','r'))
 if i==9:
  assert bones[prefix+'lantern']['parent']==prefix+'body'
  assert all(bones[prefix+f'wing_{side}_tip']['parent']==prefix+f'wing_{side}' for side in ('l','r'))
 if i==10:
  assert bones[prefix+'tail_blade']['parent']==prefix+'tail' and all(bones[prefix+f'hock_{n}']['parent']==prefix+f'leg_{n}' for n in range(4))
 if i==11:
  assert bones[prefix+'needle']['parent']==prefix+'body' and all(bones[prefix+f'leg_tip_{n}']['parent']==prefix+f'leg_{n}' for n in range(8))
 client=json.loads((rp/f'entity/{name}.entity.json').read_text())['minecraft:client_entity']['description']
 assert client['geometry']['default']==d['identifier'] and client['textures']['default']==f'textures/entity/{name}'
 for label in ('walk','windup','strike'):
  aid=f'animation.hakkai.{name}_{label}';alias='walk' if label=='walk' else 'creature_'+label
  assert client['animations'][alias]==aid and set(anims[aid]['bones'])<=bones.keys()
  if label!='walk':assert anims[aid]['animation_length']==(1.9 if label=='windup' else .38)
  if label!='walk':assert client['animations']['talent_'+label]==aid
 ts=json.loads((rp/f'textures/entity/{name}.texture_set.json').read_text())['minecraft:texture_set']
 assert ts['color']==name and ts['normal']==name+'_n' and ts['metalness_emissive_roughness']==name+'_mer'
 imgs=[Image.open(rp/f'textures/entity/{name}{suffix}.png').convert('RGBA') for suffix in ('','_n','_mer')]
 assert all(im.size==(1024,1024) for im in imgs)
 assert imgs[2].getchannel('G').getextrema()==(0,0)
 assert imgs[2].getchannel('R').getextrema()==(0,0)
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
assert len(hashes)==12 and all(rigs[i].isdisjoint(rigs[j]) for i in range(12) for j in range(i))
print('Forest foe: twelve bespoke rigs, 48 animation references and 1024px per-face maps OK (static only)')
