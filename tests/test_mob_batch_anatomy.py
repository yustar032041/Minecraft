"""Targeted batch geometry/rig checks; not a Bedrock animation test."""
import collections, copy, json, sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from refine_mob_anatomy import refine_baked, refine_model
from preview_mob_geometry import collect
rp=root/'Hakkai_v7.1.0/ResourcePack'

def bones(name):
    model=json.loads((rp/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0]
    return {b['name']:b for b in model['bones']}

def touches(a,b):
    return all(a['origin'][i]<=b['origin'][i]+b['size'][i]+1e-6 and b['origin'][i]<=a['origin'][i]+a['size'][i]+1e-6 for i in range(3))

def joined(b,child,parent):
    assert b[child]['parent']==parent
    assert any(touches(a,c) for a in b[child]['cubes'] for c in b[parent]['cubes']),(child,parent)

# In the two grassland arthropods, rotating the new outer feet by the
# legacy leg tilt buried them underground; verify the complete rest pose.
for i in (3,6):
    model=json.loads((rp/f'models/entity/foe_0_{i}.geo.json').read_text())['minecraft:geometry'][0]
    assert min(v[1] for quad,_ in collect(model) for v in quad)>=-1e-6
    b={item['name']:item for item in model['bones']}
    for j in range(6 if i==3 else 8):
        leg=b[f'f0_{i}_leg_{j}'];assert leg['rotation']==[0,0,0]
        assert len(leg['cubes'])==3 and leg['cubes'][2]['origin'][1]==0

b=bones('foe_0_10')
for side in ('l','r'):
    joined(b,f'f0_10_forearm_{side}',f'f0_10_arm_{side}')
    joined(b,f'f0_10_arm_{side}_detail_blade',f'f0_10_forearm_{side}')

b=bones('foe_0_11');body=b['f0_11_body']['cubes'][0]
for i in range(4):
    leg=b[f'f0_11_leg_{i}'];assert leg['cubes'][0]['size'][0]<=1.1
    assert touches(leg['cubes'][0],body) and leg['cubes'][0]['origin'][1]==0

b=bones('foe_1_11')
for side in ('l','r'):joined(b,f'f1_11_fang_{side}','f1_11_head')
b=bones('foe_2_8');joined(b,'f2_8_jaw','f2_8_head')
assert b['f2_8_jaw']['cubes'][0]['size'][0]>b['f2_8_head']['cubes'][0]['size'][0]/2
b=bones('foe_3_10')
for i in (0,1):
    joined(b,f'f3_10_paw_{i}',f'f3_10_leg_{i}')
    assert b[f'f3_10_paw_{i}']['cubes'][1]['size'][0]>b[f'f3_10_paw_{i+2}']['cubes'][1]['size'][0]
b=bones('foe_4_0')
for i in (0,1):joined(b,f'f4_0_foot_{i}',f'f4_0_leg_{i}')
for side in ('l','r'):assert b[f'f4_0_fist_{side}']['cubes'][0]['origin'][1]==2.5
for realm in (6,7):
    b=bones(f'foe_{realm}_11' if realm==6 else 'foe_7_7')
    prefix='f6_11_' if realm==6 else 'f7_7_'
    for i in (2,3):joined(b,prefix+f'hock_{i}',prefix+f'leg_{i}')
# A changed model must reuse each UV allocation, even when moving a cube
# to a different bone. The real generator tests check all baked file bytes.
raw_model={'bones':[{'name':'f2_8_head','cubes':[
    {'origin':[0,0,0],'size':[1,1,1],'uv':{'north':{'uv':[4,5],'uv_size':[2,2]}}},
    {'origin':[0,0,1],'size':[1,1,1],'uv':{'north':{'uv':[8,9],'uv_size':[3,3]}}}]}]}
def uvs(model):
    return collections.Counter(json.dumps(c['uv'],sort_keys=True) for b in model['bones'] for c in b.get('cubes',[]))
refined=refine_model('foe_2_8',copy.deepcopy(raw_model))
assert uvs(raw_model)==uvs(refined)
# The refinement helper leaves other files' byte payloads untouched.
raw={'format_version':'1.12.0','minecraft:geometry':[{'bones':[]}]}
geo=Path('/virtual/other.geo.json');texture=Path('/virtual/other.png')
files={geo:json.dumps(raw).encode(),texture:b'approved texture bytes'}
assert refine_baked('other',files)[texture]==b'approved texture bytes'
print('Eight targeted MOB geometry refinements: joint contact and approved texture preservation (static only)')
