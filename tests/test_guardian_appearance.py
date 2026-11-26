"""Verify guardian geometry and UV assets, not in-engine look or art quality."""
import json, subprocess, sys
from pathlib import Path
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from build_guardian_appearances import DESIGNS
root=Path(__file__).resolve().parents[1]
rp=root/'Hakkai_v7.1.0/ResourcePack'
subprocess.run([sys.executable,str(root/'tools/build_guardian_appearances.py'),'--check'],cwd=root,check=True)
subprocess.run([sys.executable,str(root/'tools/sync_guardian_detail_animations.py'),'--check'],cwd=root,check=True)
animations=json.loads((rp/'animations/guardian_details.animation.json').read_text())['animations']
assert len(animations)==8
rigs=json.loads((rp/'animations/guardian_individual_rigs.animation.json').read_text())['animations']
assert len(rigs)==80
allids=set();shapes=set();stances=set();signature_bones=[]
for i in range(8):
 name=f'guardian_{i}';base=json.loads((root/'tools/art_templates/mob_baselines'/f'{name}.geo.json').read_text())['minecraft:geometry'][0]
 model=json.loads((rp/'models/entity'/f'{name}.geo.json').read_text())['minecraft:geometry'][0]
 d=model['description'];assert d['identifier']==base['description']['identifier'];assert (d['texture_width'],d['texture_height'])==(1024,1024)
 assert d['visible_bounds_width']>=4 and d['visible_bounds_height']>=4
 old={b['name']:b for b in base['bones']};new={b['name']:b for b in model['bones']}
 assert {f'g{i}_{key}' for key in old} < new.keys()
 assert all(key.startswith(f'g{i}_') for key in new)
 assert all(b.get('parent') in new for b in model['bones'] if b.get('parent'))
 for key in old:
  renamed=new[f'g{i}_{key}']
  assert old[key].get('rotation')==renamed.get('rotation'),(name,key,'rotation')
  # Only the sky guardian's wing hinges were moved to meet its narrower torso.
  if key.startswith('leg_'):
   assert renamed['pivot'][1]==8
  elif i==6 and key in ('wing_l','wing_r'):
   assert renamed['pivot']==[-3.4 if key=='wing_l' else 3.4,12,1]
  else:assert old[key].get('pivot')==renamed.get('pivot'),(name,key,'pivot')
  parent=old[key].get('parent');assert renamed.get('parent')==(f'g{i}_{parent}' if parent else None)
  assert len(renamed.get('cubes',[]))>=len(old[key].get('cubes',[]))
 assert sum(len(b.get('cubes',[])) for b in model['bones'])>sum(len(b.get('cubes',[])) for b in base['bones'])
 shapes.add(tuple(new[f'g{i}_body']['cubes'][0]['size']))
 stances.add(tuple(tuple(new[f'g{i}_leg_{leg}']['pivot']) for leg in range(4)))
 assert len(new[f'g{i}_body']['cubes'])>=2 and len(new[f'g{i}_head']['cubes'])>=3
 extra=set(new)-{f'g{i}_{key}' for key in old};signature_bones.append(set(new))
 assert all(name.startswith(f'g{i}_') for name in extra)
 for leg in range(4):
  shin=new[f'g{i}_shin_{leg}'];assert shin['parent']==f'g{i}_leg_{leg}'
  upper=new[f'g{i}_leg_{leg}']['cubes'][0];lower,foot=shin['cubes']
  hip=new[f'g{i}_leg_{leg}']['pivot']; torso=new[f'g{i}_body']['cubes'][0]
  assert all(torso['origin'][a]<=hip[a]<=torso['origin'][a]+torso['size'][a] for a in (0,1,2))
  assert shin['pivot']==[hip[0],lower['origin'][1]+lower['size'][1],hip[2]]
  assert upper['origin'][1]==lower['origin'][1]+lower['size'][1] and upper['origin'][1]+upper['size'][1]==8
  assert foot['origin'][1]==0 and foot['size'][1]==lower['origin'][1]
 assert any('_head_detail_' in name for name in extra)
 assert any('_body_detail_' in name for name in extra)
 if i==6:
  for side in ('l','r'):
   for j in (0,1):assert new[f'g6_wing_{side}_detail_{j}']['parent']==f'g6_wing_{side}'
 client=json.loads((rp/'entity'/f'{name}.entity.json').read_text())['minecraft:client_entity']['description']
 assert client['textures']['default']==f'textures/entity/{name}' and client['geometry']['default']==d['identifier']
 aid=f'animation.hakkai.guardian_{i}_detail'
 assert client['animations']['guardian_detail']==aid and client['scripts']['animate'].count('guardian_detail')==1
 assert animations[aid]['loop'] is True and set(animations[aid]['bones'])<=extra
 for leg in range(4):assert f'g{i}_shin_{leg}' in animations[aid]['bones']
 assert f'g{i}_tail_detail_0' in animations[aid]['bones']
 for label in ('walk','windup','strike'):
  aid=f'animation.hakkai.guardian_{i}_{label}'
  alias={'walk':'walk','windup':'creature_windup','strike':'creature_strike'}[label]
  assert client['animations'][alias]==aid and set(rigs[aid]['bones'])<=set(new)
 for style in ('brace','lunge','cast'):
  for phase in ('windup','strike'):
   aid=f'animation.hakkai.guardian_{i}_{style}_{phase}'
   assert client['animations'][f'guardian_{style}_{phase}']==aid and set(rigs[aid]['bones'])<=set(new)
 texset=json.loads((rp/'textures/entity'/f'{name}.texture_set.json').read_text())['minecraft:texture_set']
 assert texset['color']==name and texset['normal']==name+'_n' and texset['metalness_emissive_roughness']==name+'_mer'
 imgs=[Image.open(rp/'textures/entity'/f'{name}{suffix}.png').convert('RGBA') for suffix in ('','_n','_mer')]
 assert all(im.size==(1024,1024) for im in imgs)
 assert imgs[0].getchannel('A').tobytes()==imgs[1].getchannel('A').tobytes()==imgs[2].getchannel('A').tobytes()
 # Every UV face has fully painted RGB/normal/material data and no face overlap.
 rects=[]
 for bone in model['bones']:
  for cube in bone.get('cubes',[]):
   assert set(cube['uv'])=={'north','south','east','west','up','down'}
   for face in cube['uv'].values():
    x,y=face['uv'];w,h=face['uv_size'];assert 1<=x<x+w<1024 and 1<=y<y+h<1024
    for xx,yy,ww,hh in rects:assert x+w<=xx or xx+ww<=x or y+h<=yy or yy+hh<=y,(name,face)
    rects.append((x,y,w,h))
    for im in imgs:assert im.getchannel('A').crop((x-1,y-1,x+w+1,y+h+1)).getextrema()==(255,255),(name,face)
 # Each normal face is independently generated, with a flat border so
 # adjacent atlas patches cannot inject unrelated normal gradients.
 for x,y,w,h in rects:
  normal=imgs[1]
  assert all(normal.getpixel((xx,y))==(128,128,252,255) and normal.getpixel((xx,y+h-1))==(128,128,252,255) for xx in range(x,x+w))
  assert all(normal.getpixel((x,yy))==(128,128,252,255) and normal.getpixel((x+w-1,yy))==(128,128,252,255) for yy in range(y,y+h))
 assert imgs[0].getchannel('A').histogram()[255]>100000,(name,'texture utilization')
 assert len(imgs[0].convert('RGB').getcolors(1024*1024))>1000
 # Head markings are distinct from the two side-facing eyes; the muzzle's
 # front has two dark nostrils. This checks painted texels, not how the engine
 # projects or blends them on the animated model.
 head=new[f'g{i}_head']['cubes']
 front=head[0]['uv']['north'];x,y=front['uv'];w,h=front['uv_size']
 accent=(*DESIGNS[i]['accent'],255)
 assert accent in {color for _,color in imgs[0].crop((x,y,x+w,y+round(h*.42))).getcolors(w*h)},(name,'forehead motif')
 for face in ('west','east'):
  x,y=head[0]['uv'][face]['uv'];w,h=head[0]['uv'][face]['uv_size'];cx=x+round(w*.36);cy=y+round(h*.39)
  assert imgs[0].getpixel((cx,cy))==(24,25,28,255),(name,face,'eye pupil')
  assert imgs[0].getpixel((cx+max(3,round(w*.075))//2,cy))!=imgs[0].getpixel((cx,cy)),(name,face,'eye iris')
 x,y=head[1]['uv']['north']['uv'];w,h=head[1]['uv']['north']['uv_size']
 for fx in (.3,.7):assert imgs[0].getpixel((x+round(w*fx),y+round(h*.60)))==(37,31,29,255),(name,'nostril')
 allids.add(imgs[0].tobytes())
assert len(allids)==8 and len(shapes)==8 and len(stances)==8
for i in range(8):
 for j in range(i):assert signature_bones[i].isdisjoint(signature_bones[j])
print('Guardian visuals: 8 distinct atlases, per-face UV, gutters, maps, skeletons and references OK (static only)')
# The legacy alias installer must not revert the per-guardian rig. Exercise it
# in a temporary fake pack, never against workspace assets.
import tempfile, shutil
with tempfile.TemporaryDirectory() as tmp:
 fake=Path(tmp);(fake/'tools').mkdir();shutil.copy(root/'tools/setup_mob_attack_animation.py',fake/'tools/setup_mob_attack_animation.py')
 dst=fake/'Hakkai_v7.1.0/ResourcePack';(dst/'entity').mkdir(parents=True);(dst/'animations').mkdir()
 names=[f'wild_{r}_{v}' for r in range(8) for v in range(3)]+[f'foe_{r}_{v}' for r in range(8) for v in range(12)]+[f'guardian_{r}' for r in range(8)]+[f'ender_{r}' for r in range(8)]+['fushi_chief','eclipse_colossus']
 for n in names:(dst/'entity'/f'{n}.entity.json').write_text(json.dumps({'minecraft:client_entity':{'description':{'animations':{}}}}))
 subprocess.run([sys.executable,str(fake/'tools/setup_mob_attack_animation.py')],check=True,stdout=subprocess.DEVNULL)
 for i in range(8):
  a=json.loads((dst/'entity'/f'guardian_{i}.entity.json').read_text())['minecraft:client_entity']['description']['animations']
  assert a['creature_windup']==f'animation.hakkai.guardian_{i}_windup' and a['creature_strike']==f'animation.hakkai.guardian_{i}_strike'
 for i in range(8):
  a=json.loads((dst/'entity'/f'ender_{i}.entity.json').read_text())['minecraft:client_entity']['description']['animations']
  assert a['creature_windup']==f'animation.hakkai.ender_{i}_windup' and a['creature_strike']==f'animation.hakkai.ender_{i}_strike'
 for i in range(12):
  a=json.loads((dst/'entity'/f'foe_0_{i}.entity.json').read_text())['minecraft:client_entity']['description']['animations']
  assert a['creature_windup']==f'animation.hakkai.foe_0_{i}_windup' and a['creature_strike']==f'animation.hakkai.foe_0_{i}_strike'
 for i in range(12):
  a=json.loads((dst/f'entity/foe_1_{i}.entity.json').read_text())['minecraft:client_entity']['description']['animations']
  assert a['creature_windup']==f'animation.hakkai.foe_1_{i}_windup' and a['creature_strike']==f'animation.hakkai.foe_1_{i}_strike'
 for r in range(8):
  for i in range(3):
   a=json.loads((dst/f'entity/wild_{r}_{i}.entity.json').read_text())['minecraft:client_entity']['description']['animations']
   assert a['creature_windup']==f'animation.hakkai.wild_{r}_{i}_windup' and a['creature_strike']==f'animation.hakkai.wild_{r}_{i}_strike'
 for i in range(12):
  a=json.loads((dst/f'entity/foe_2_{i}.entity.json').read_text())['minecraft:client_entity']['description']['animations']
  assert a['creature_windup']==f'animation.hakkai.foe_2_{i}_windup' and a['creature_strike']==f'animation.hakkai.foe_2_{i}_strike'
 for i in range(12):
  a=json.loads((dst/f'entity/foe_3_{i}.entity.json').read_text())['minecraft:client_entity']['description']['animations']
  assert a['creature_windup']==f'animation.hakkai.foe_3_{i}_windup' and a['creature_strike']==f'animation.hakkai.foe_3_{i}_strike'
 for i in range(12):
  a=json.loads((dst/f'entity/foe_4_{i}.entity.json').read_text())['minecraft:client_entity']['description']['animations']
  assert a['creature_windup']==f'animation.hakkai.foe_4_{i}_windup' and a['creature_strike']==f'animation.hakkai.foe_4_{i}_strike'
 for i in range(12):
  a=json.loads((dst/f'entity/foe_5_{i}.entity.json').read_text())['minecraft:client_entity']['description']['animations']
  assert a['creature_windup']==f'animation.hakkai.foe_5_{i}_windup' and a['creature_strike']==f'animation.hakkai.foe_5_{i}_strike'
 for i in range(12):
  a=json.loads((dst/f'entity/foe_6_{i}.entity.json').read_text())['minecraft:client_entity']['description']['animations']
  assert a['creature_windup']==f'animation.hakkai.foe_6_{i}_windup' and a['creature_strike']==f'animation.hakkai.foe_6_{i}_strike'
 for i in range(12):
  a=json.loads((dst/f'entity/foe_7_{i}.entity.json').read_text())['minecraft:client_entity']['description']['animations']
  assert a['creature_windup']==f'animation.hakkai.foe_7_{i}_windup' and a['creature_strike']==f'animation.hakkai.foe_7_{i}_strike'
 a=json.loads((dst/'entity/fushi_chief.entity.json').read_text())['minecraft:client_entity']['description']['animations']
 assert a['creature_strike']=='animation.hakkai.creature_strike'
