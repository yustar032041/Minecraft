"""Check preserved 512px legacy snapshots, not the new pack appearance."""
import json, subprocess, sys
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
RP=ROOT/'Hakkai_v7.1.0/ResourcePack'
LEGACY=ROOT/'tools/art_templates/grassland_legacy'
subprocess.run([sys.executable,str(ROOT/'tools/build_grassland_mob_art.py'),'--check'],check=True,cwd=ROOT)
for species in ['wild_0_0','wild_0_1','wild_0_2']:
 path=LEGACY/'models'/f'{species}.geo.json'
 model=json.loads(path.read_text())['minecraft:geometry'][0]
 base=json.loads((ROOT/'tools/art_templates/mob_baselines'/f'{species}.geo.json').read_text())['minecraft:geometry'][0]
 assert model['description']==base['description'],species
 before={b['name']:b for b in base['bones']};after={b['name']:b for b in model['bones']}
 assert set(before)==set(after)
 for name in before:
  for k in ('pivot','parent','rotation'):
   assert before[name].get(k)==after[name].get(k),(species,name,k)
  assert len(after[name].get('cubes',[]))>=len(before[name].get('cubes',[]))
 client=json.loads((RP/'entity'/f'{species}.entity.json').read_text())['minecraft:client_entity']['description']
 assert client['geometry']['default']==model['description']['identifier']
 assert client['textures']['default']==f'textures/entity/{species}'
 texset=json.loads((RP/'textures/entity'/f'{species}.texture_set.json').read_text())['minecraft:texture_set']
 assert texset['color']==species and texset['normal']==species+'_n' and texset['metalness_emissive_roughness']==species+'_mer'
 imgs=[Image.open(LEGACY/'textures'/f'{species}{suffix}.png').convert('RGBA') for suffix in ('','_n','_mer')]
 for im in imgs:assert im.size==(512,512)
 occupied=set()
 for bone in model['bones']:
  for cube in bone.get('cubes',[]):
   assert set(cube['uv'])=={'north','south','east','west','up','down'}
   for face in cube['uv'].values():
    x,y=face['uv'];w,h=face['uv_size'];assert 0<=x<x+w<=512 and 0<=y<y+h<=512
    for yy in range(y,y+h):
     for xx in range(x,x+w):
      assert (xx,yy) not in occupied,(species,xx,yy)
      occupied.add((xx,yy))
      assert all(im.getpixel((xx,yy))[3]==255 for im in imgs),(species,xx,yy)
      assert imgs[2].getpixel((xx,yy))[:3]==(0,0,190)
 assert len(occupied)>4000
 assert len(imgs[0].getcolors(262144))>100, species
assert len(json.loads((LEGACY/'models/wild_0_0.geo.json').read_text())['minecraft:geometry'][0]['bones'][1]['cubes'])==12
before=[(RP/f'models/entity/wild_0_{i}.geo.json').read_bytes() for i in range(3)]
result=subprocess.run([sys.executable,str(ROOT/'tools/build_grassland_mob_art.py'),'--write'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
assert result.returncode!=0 and before==[(RP/f'models/entity/wild_0_{i}.geo.json').read_bytes() for i in range(3)]
print('Preserved 512px grassland prototypes verified; legacy overwrite blocked (static only)')
