"""Series armor recipes and geometry checks; Bedrock rendering is not tested."""
import json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=root/'BehaviorPack';rp=root/'ResourcePack'
model=json.loads((rp/'models/entity/hakkai_icon_armor.geo.json').read_text())['minecraft:geometry'];assert len(model)==4
for g in model:
 assert g['description']['texture_width']==g['description']['texture_height']==64
 part=g['description']['identifier'].removeprefix('geometry.hakkai.icon_armor_')
 allowed={'helmet':{'head'},'chest':{'body','rightArm','leftArm'},'leggings':{'body','rightLeg','leftLeg'},'boots':{'rightLeg','leftLeg'}}[part]
 assert {b['name'] for b in g['bones'] if b.get('cubes')}==allowed
 cubes=[c for b in g['bones'] for c in b.get('cubes',[])];assert len(cubes)>=6
 for c in cubes:
  assert all(x>0 for x in c['size'])
  assert set(c['uv'])=={'north','south','east','west','up','down'}
  for face in c['uv'].values():
   u,v=face['uv'];w,h=face['uv_size'];assert 0<=u<u+w<=64 and 0<=v<v+h<=64
legs=next(g for g in model if g['description']['identifier'].endswith('_leggings'))
boots=next(g for g in model if g['description']['identifier'].endswith('_boots'))
for side in ['rightLeg','leftLeg']:
 knee=next(b for b in legs['bones'] if b['name']==side)['cubes'][1]
 boot_cubes=next(b for b in boots['bones'] if b['name']==side)['cubes']
 for boot in boot_cubes:
  assert knee['origin'][1]>boot['origin'][1]+boot['size'][1]+boot.get('inflate',0), 'static boot parts must stay below the knee plate'
atlas=json.loads((rp/'textures/item_texture.json').read_text())['texture_data'];recipes=set()
for i in range(11):
 name=f'series_leggings_{i:02}';chest=f'gear_{10+16*i:03}';head=f'gear_{11+16*i:03}';boot=f'gear_{12+16*i:03}'
 c=json.loads((bp/'items'/f'{name}.json').read_text())['minecraft:item']['components'];assert c['minecraft:wearable']['slot']=='slot.armor.legs'
 r=json.loads((bp/'recipes'/f'{name}.json').read_text())['minecraft:recipe_shapeless'];ing=tuple(sorted(x['item'] for x in r['ingredients']));assert ing not in recipes;recipes.add(ing);assert (f'hakkai:series_leggings_{i-5:02}' if i>=5 else 'minecraft:iron_leggings') in ing and r['result']['item']==f'hakkai:{name}'
 assert atlas['hakkai_'+name]['textures']==f'textures/items/hakkai_{name}'
 for n,part in [(name,'leggings'),(chest,'chest'),(head,'helmet'),(boot,'boots')]:
  a=json.loads((rp/'attachables'/f'{n}.json').read_text())['minecraft:attachable']['description'];assert a['geometry']['default']==f'geometry.hakkai.icon_armor_{part}'
  normal=Image.open(rp/f'textures/hakkai/equipment/{n}_n.png').convert('RGBA');assert len(set(normal.getdata()))>5, n
 for lang in ['ja_JP','en_US']:assert f'item.hakkai:{name}.name=' in (rp/'texts'/f'{lang}.lang').read_text()
for part in ('helmet','chest','leggings','boots'):
 a=json.loads((rp/'attachables'/f'ult_{part}.json').read_text())['minecraft:attachable']['description'];assert a['geometry']['default']==f'geometry.hakkai.icon_armor_{part}'
 assert len(set(Image.open(rp/f'textures/hakkai/equipment/ult_{part}_n.png').convert('RGBA').getdata()))>5
print('11 armor series and ultimate: recipes, per-face UV geometry and nonflat normals (static only)')
