"""Patrol geometry, UV, textures and animation references; not Bedrock validation."""
import hashlib,json,subprocess,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];rp=root/'Hakkai_v7.1.0/ResourcePack'
subprocess.run([sys.executable,str(root/'tools/build_patrol_individual_art.py'),'--check'],cwd=root,check=True)
patrol=json.loads((rp/'animations/patrol_attacks.animation.json').read_text())['animations']
walk=json.loads((rp/'animations/wild.animation.json').read_text())['animations']['animation.hakkai.brute.stride']
models=[];hashes=set()
for name in ('village_archer','village_mage','village_watch'):
 model=json.loads((rp/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0];d=model['description'];bones={b['name']:b for b in model['bones']}
 assert d['identifier']==f'geometry.hakkai.{name}' and (d['texture_width'],d['texture_height'])==(1024,1024)
 assert len(bones)==len(model['bones']) and all(b.get('parent') in bones for b in bones.values() if b.get('parent'))
 assert set(('body','head','arm_l','arm_r','leg_0','leg_1'))<=bones.keys()
 if name=='village_archer':assert bones['bow']['parent']=='arm_l' and bones['quiver']['parent']=='body'
 if name=='village_mage':assert bones['hat']['parent']=='head' and bones['staff']['parent']=='arm_r'
 if name=='village_watch':assert bones['shield']['parent']=='arm_l' and bones['crest']['parent']=='head'
 models.append(json.dumps([[b['name'],b.get('parent'),[(c['origin'],c['size']) for c in b.get('cubes',[])]] for b in model['bones']]))
 desc=json.loads((rp/f'entity/{name}.entity.json').read_text())['minecraft:client_entity']['description']
 assert desc['geometry']['default']==d['identifier'] and desc['textures']['default']==f'textures/entity/{name}'
 assert set(walk['bones'])<=bones.keys() and desc['animations']['walk']=='animation.hakkai.brute.stride'
 for short,aid in desc['animations'].items():
  if short.startswith('patrol_'):assert aid in patrol and set(patrol[aid]['bones'])<=bones.keys()
 ts=json.loads((rp/f'textures/entity/{name}.texture_set.json').read_text())['minecraft:texture_set']
 assert ts['color']==name and ts['normal']==name+'_n' and ts['metalness_emissive_roughness']==name+'_mer'
 imgs=[Image.open(rp/f'textures/entity/{name}{suffix}.png').convert('RGBA') for suffix in ('','_n','_mer')]
 assert all(im.size==(1024,1024) for im in imgs)
 assert imgs[2].getchannel('R').getextrema()==((0,110) if name=='village_watch' else (0,0))
 assert imgs[2].getchannel('G').getextrema()==(0,0)
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
assert len(set(models))==3 and len(hashes)==3
print('Patrol: 3 role-specific models, existing animation references and per-face 1024px maps OK (static only)')
