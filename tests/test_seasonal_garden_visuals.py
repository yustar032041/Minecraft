"""Static crop visual checks; not an engine renderer or proof of art quality."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageChops
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from build_seasonal_garden_visuals import NAMES, BOXES, outputs, previews, geometry
from preview_mob_geometry import collect
RP=ROOT/'Hakkai_v7.1.0/ResourcePack'
BP=ROOT/'Hakkai_v7.1.0/BehaviorPack'
legacy=ROOT/'tools/art_templates/seasonal_garden/legacy'
geo=json.loads((RP/'models/blocks/field_crops.geo.json').read_text())['minecraft:geometry']
models={g['description']['identifier']:g for g in geo}
assert len(geo)==20 and len(models)==20
assert len(json.loads((legacy/'field_crops.geo.json').read_text())['minecraft:geometry'])==20
atlas=json.loads((RP/'textures/terrain_texture.json').read_text())['texture_data']
for name in NAMES:
    source=ROOT/'art_sources/seasonal_garden'/f'{name}_reference.png'
    with Image.open(source) as reference: assert min(reference.size)>=1000
    for suffix in ('','_mer','_n'):
        with Image.open(legacy/f'hakkai_{name}{suffix}.png') as old: assert old.size==(32,32)
        with Image.open(RP/f'textures/blocks/hakkai_{name}{suffix}.png') as image: assert image.size==(512,512)
    texture_set=json.loads((RP/f'textures/blocks/hakkai_{name}.texture_set.json').read_text())['minecraft:texture_set']
    assert texture_set['color']==f'hakkai_{name}'
    assert texture_set['normal']==f'hakkai_{name}_n'
    assert texture_set['metalness_emissive_roughness']==f'hakkai_{name}_mer'
    assert atlas[f'hakkai_{name}']['textures']==f'textures/blocks/hakkai_{name}'
    block=json.loads((BP/f'blocks/{name}.json').read_text())['minecraft:block']
    assert block['description']['states']['hakkai:age']==[0,1,2,3]
    assert block['components']['hakkai:field_crop']=={}
    assert block['components']['minecraft:collision_box'] is False
    assert len(block['permutations'])==3
    for age in range(4):
        components=block['components'] if age==0 else block['permutations'][age-1]['components']
        ident=f'geometry.hakkai.{name}_{age}'
        assert components['minecraft:geometry']==ident
        model=models[ident]
        assert model['description']['texture_width']==model['description']['texture_height']==512
        cubes=[c for b in model['bones'] for c in b.get('cubes',[])]
        assert 3<=len(cubes)<=20
        for cube in cubes:
            assert all(v>0 for v in cube['size'])
            assert set(cube['uv'])=={'north','south','east','west','up','down'}
            for face in cube['uv'].values():
                u,v=face['uv'];w,h=face['uv_size'];assert 0<=u<u+w<=512 and 0<=v<v+h<=512
        # Approximation of transformed cuboid corners vs the unchanged
        # selection box. Rotation convention and Bedrock hit tests may differ.
        bounds=components['minecraft:selection_box'];origin=bounds['origin'];size=bounds['size']
        pts=[p for q,_ in collect(model) for p in q]
        for axis in range(3):
            assert min(p[axis] for p in pts)>=origin[axis]-1e-7,(name,age,axis,'min')
            assert max(p[axis] for p in pts)<=origin[axis]+size[axis]+1e-7,(name,age,axis,'max')
    # Harvest loot/behavior remains connected, not merely an illustration.
    assert 'minecraft:loot' in block['permutations'][2]['components']
assert len({json.dumps(models[f'geometry.hakkai.{name}_3']['bones'],sort_keys=True) for name in NAMES})==5
# Specific improvements to flower/fruit silhouettes and stage distinction.
def cubes(name,stage):return geometry(name,stage)['bones'][0]['cubes']
# Five species no longer use an identical early-stage leaf profile.
assert len({(cubes(name,0)[1]['size'][2],cubes(name,0)[1]['rotation'][2]) for name in NAMES})==5
assert BOXES['summer_corn'][2]!=BOXES['summer_corn'][3] # cob versus tassel
corn=cubes('summer_corn',3);assert sum(c.get('rotation') is not None for c in corn)>=5
assert cubes('summer_corn',2)[-1]['size']==[1.8,3.3,2] # young husked ear
assert sum(c.get('rotation') is not None for c in cubes('spring_tulip',3))>=4
assert sum(c.get('rotation') is not None for c in cubes('ice_blossom',3))>=6
assert sum(c.get('rotation') is not None for c in cubes('summer_sunflower',3))>=12
# Fruit side strips touch the main body without crossing and sharing its top.
fruit=cubes('autumn_squash',3);centre,left,right=fruit[:3]
assert left['origin'][0]+left['size'][0]==centre['origin'][0]
assert centre['origin'][0]+centre['size'][0]==right['origin'][0]
for path,data in {**outputs(),**previews()}.items():assert path.read_bytes()==data,path
for name in NAMES:
    sheet=Image.open(ROOT/f'art_sources/seasonal_garden/previews/{name}_stages.png').convert('RGB')
    heights=[]
    for stage in (0,3):
        panel=sheet.crop((stage*300,190,stage*300+150,320))
        bounds=ImageChops.difference(panel,Image.new('RGB',panel.size,(32,36,42))).getbbox()
        assert bounds is not None
        heights.append(bounds[3]-bounds[1])
    assert heights[0]<heights[1],(name,heights)
print('5 crop visual prototypes: 20 stages, selection bounds, 512px maps, stage previews and reproducibility (static only)')
