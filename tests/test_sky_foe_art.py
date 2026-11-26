"""Sky foe reproducibility, rigs, UV and animation checks, not Bedrock quality validation."""
import hashlib,json,subprocess,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];rp=root/'Hakkai_v7.1.0/ResourcePack'
for tool in ('build_sky_foe_art.py','build_sky_foe_more_art.py','sync_sky_foe_visuals.py'):
 subprocess.run([sys.executable,str(root/'tools'/tool),'--check'],cwd=root,check=True)
anims=json.loads((rp/'animations/sky_foe_individual.animation.json').read_text())['animations'];assert len(anims)==48
rigs=[];hashes=set();shapes=set()
for i in range(12):
 name=f'foe_6_{i}';prefix=f'f6_{i}_';model=json.loads((rp/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0];d=model['description']
 assert d['identifier']==f'geometry.hakkai.{name}' and (d['texture_width'],d['texture_height'])==(1024,1024)
 bones={b['name']:b for b in model['bones']};assert len(bones)==len(model['bones']) and all(b.startswith(prefix) for b in bones)
 assert all(b.get('parent') in bones for b in bones.values() if b.get('parent'));rigs.append(set(bones))
 shapes.add(json.dumps([[b['name'].removeprefix(prefix), b.get('parent','').removeprefix(prefix), [(c['origin'],c['size']) for c in b.get('cubes',[])]] for b in model['bones']]))
 assert prefix+'body' in bones and prefix+'head' in bones
 if i==0:
  assert all(prefix+f'leg_{n}' in bones for n in range(4))
  assert bones[prefix+'tail_fan']['parent']==prefix+'tail'
 if i in (0,1):assert all(bones[prefix+f'wing_{side}_tip']['parent']==prefix+f'wing_{side}' for side in ('l','r'))
 if i==1:assert bones[prefix+'wind_ring']['parent']==prefix+'body'
 if i==2:
  assert all(bones[prefix+f'fist_{side}']['parent']==prefix+f'arm_{side}' for side in ('l','r'))
  assert prefix+'shoulder_gust' in bones and prefix+'cloud_crest' in bones
  emblem=bones[prefix+'body']['cubes'][2]
  for other in bones.values():
   for cube in other.get('cubes',[]):
    if cube is emblem:continue
    overlap=all(emblem['origin'][axis]<cube['origin'][axis]+cube['size'][axis] and cube['origin'][axis]<emblem['origin'][axis]+emblem['size'][axis] for axis in (0,1))
    if overlap:assert cube['origin'][2]>=emblem['origin'][2],(name,other['name'])
 if i==3:
  assert all(bones[prefix+f'foot_{n}']['parent']==prefix+f'leg_{n}' for n in range(6))
  assert all(bones[prefix+f'shell_{side}']['parent']==prefix+'body' for side in ('l','r'))
 if i==4:assert bones[prefix+'tail_tip']['parent']==prefix+'tail' and prefix+'wind_mark' in bones
 if i==5:assert prefix+'mushroom' in bones
 if i in (5,8):assert all(bones[prefix+f'wing_{side}_tip']['parent']==prefix+f'wing_{side}' for side in ('l','r'))
 if i==6:
  assert all(bones[prefix+f'foot_{n}']['parent']==prefix+f'leg_{n}' for n in range(8)) and prefix+'web_frame' in bones
 if i==7:assert all(bones[prefix+f'ear_{side}']['parent']==prefix+'head' for side in ('l','r')) and prefix+'pennant' in bones
 if i==8:assert all(prefix+f'arm_{side}' in bones for side in ('l','r')) and all(prefix+f'leg_{n}' in bones for n in range(2))
 if i==9:assert bones[prefix+'tail_mid']['parent']==prefix+'tail' and bones[prefix+'tail_tip']['parent']==prefix+'tail_mid'
 if i==10:assert bones[prefix+'shield']['parent']==prefix+'body' and bones[prefix+'battlement']['parent']==prefix+'head'
 if i==11:assert bones[prefix+'vortex']['parent']==prefix+'tail'
 client=json.loads((rp/f'entity/{name}.entity.json').read_text())['minecraft:client_entity']['description']
 assert client['geometry']['default']==d['identifier'] and client['textures']['default']==f'textures/entity/{name}'
 for label in ('walk','windup','strike'):
  aid=f'animation.hakkai.{name}_{label}';alias='walk' if label=='walk' else 'creature_'+label
  assert client['animations'][alias]==aid and set(anims[aid]['bones'])<=bones.keys()
  if label!='walk':assert anims[aid]['animation_length']==(1.9 if label=='windup' else .38)
  if label!='walk':assert client['animations']['talent_'+label]==aid
 if i==0:assert all(prefix+f'leg_{n}' in anims[f'animation.hakkai.{name}_walk']['bones'] for n in range(4))
 if i==3:assert all(prefix+f'leg_{n}' in anims[f'animation.hakkai.{name}_strike']['bones'] for n in range(6))
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
assert len(shapes)==12 and len(hashes)==12 and all(rigs[i].isdisjoint(rigs[j]) for i in range(12) for j in range(i))
print('Sky foe: twelve bespoke rigs, 48 animation references and 1024px per-face maps OK (static only)')
