"""Eight-realm king asset, rig, legacy and atlas checks; not Bedrock validation."""
import hashlib,json,subprocess,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];rp=root/'Hakkai_v7.1.0/ResourcePack';name='eclipse_colossus'
subprocess.run([sys.executable,str(root/'tools/build_eight_king_art.py'),'--check'],cwd=root,check=True)
legacy=root/'tools/art_templates/eight_king/legacy'
for file,digest in {
 'eclipse_colossus.geo.json':'70ad656bf6869c1408f9e81aabe3a296c5bb340215ef710722ce575ffb614a4b',
 'eclipse_colossus.png':'6c9e34d50cb5bbcb4e8b670e96fc35ada46027d46fdf08a028fd0f4f949d701b',
 'eclipse_colossus_mer.png':'9b3d61e45eb494fed260d252c405449c5f908c004b5b493f56453d1a9fd25b95',
 'eclipse_colossus_n.png':'9b0555164f3fd19e05d651fb713809d120c1fc6a7ce7984f7ea7e92fe76820e5',
}.items():assert hashlib.sha256((legacy/file).read_bytes()).hexdigest()==digest,file
model=json.loads((rp/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0];d=model['description'];bones={b['name']:b for b in model['bones']}
assert d['identifier']=='geometry.hakkai.eclipse_colossus' and (d['texture_width'],d['texture_height'])==(1024,1024)
assert len(bones)==len(model['bones']) and all(b.get('parent') in bones for b in bones.values() if b.get('parent'))
assert set(('body','head','arm_l','arm_r','leg_0','leg_1','halo','crown','core'))<=bones.keys()
for side in ('l','r'):
 assert bones['forearm_'+side]['parent']=='arm_'+side and bones['fist_'+side]['parent']=='forearm_'+side
 assert bones['pauldron_'+side]['parent']=='arm_'+side
for n in range(2):assert bones[f'shin_{n}']['parent']==f'leg_{n}'
realms=('grass','forest','desert','ice','storm','underworld','sky','clockwork')
for realm in realms:
 b=bones['realm_'+realm];assert b['parent']=='breastplate' and len(b['cubes'])==1
 # An overlapping box must not be in front of a sigil, otherwise the visible
 # painted face can be hidden. This is static coordinate evidence only.
 emblem=b['cubes'][0]
 for other in bones.values():
  for cube in other.get('cubes',[]):
   if cube is emblem:continue
   overlap=all(emblem['origin'][axis]<cube['origin'][axis]+cube['size'][axis] and cube['origin'][axis]<emblem['origin'][axis]+emblem['size'][axis] for axis in (0,1))
   if overlap:assert cube['origin'][2]>=emblem['origin'][2],(realm,other['name'])
desc=json.loads((rp/f'entity/{name}.entity.json').read_text())['minecraft:client_entity']['description']
assert desc['geometry']['default']==d['identifier'] and desc['textures']['default']==f'textures/entity/{name}'
anims={}
for f in ('eclipse_colossus.animation.json','creature_attacks.animation.json'):
 anims.update(json.loads((rp/'animations'/f).read_text())['animations'])
for short in ('idle','walk','creature_windup','creature_strike'):
 aid=desc['animations'][short];assert aid in anims and set(anims[aid]['bones'])<=bones.keys(),(short,aid)
ts=json.loads((rp/f'textures/entity/{name}.texture_set.json').read_text())['minecraft:texture_set']
assert ts['color']==name and ts['normal']==name+'_n' and ts['metalness_emissive_roughness']==name+'_mer'
imgs=[Image.open(rp/f'textures/entity/{name}{suffix}.png').convert('RGBA') for suffix in ('','_n','_mer')]
assert all(im.size==(1024,1024) for im in imgs)
assert imgs[2].getchannel('R').getextrema()==(0,140) and imgs[2].getchannel('G').getextrema()==(0,80)
alpha=[im.getchannel('A') for im in imgs];assert alpha[0].tobytes()==alpha[1].tobytes()==alpha[2].tobytes()
rects=[]
for bone in model['bones']:
 for cube in bone.get('cubes',[]):
  assert 'material' not in cube and set(cube['uv'])=={'north','south','east','west','up','down'}
  for face in cube['uv'].values():
   x,y=face['uv'];w,h=face['uv_size'];assert 1<=x<x+w<1024 and 1<=y<y+h<1024
   assert all(x+w<=xx or xx+ww<=x or y+h<=yy or yy+hh<=y for xx,yy,ww,hh in rects),(bone['name'],face)
   rects.append((x,y,w,h))
   for a in alpha:assert a.crop((x-1,y-1,x+w+1,y+h+1)).getextrema()==(255,255)
# Distinct forward sigil patches make each realm identifiable in the atlas.
patches=[]
for realm in realms:
 f=bones['realm_'+realm]['cubes'][0]['uv']['north'];x,y=f['uv'];w,h=f['uv_size']
 patches.append(hashlib.sha256(imgs[0].crop((x,y,x+w,y+h)).tobytes()).digest())
assert len(set(patches))==8
print('Eight-realm king: 8 sigils, legacy assets, 1024px per-face maps and animation references OK (static only)')
