"""Cross-realm refinements: reproducible assets, existing UVs and rest joints.

These are static tests, not a Bedrock rendering or animation assessment.
"""
import collections, importlib, json, sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'tools'))
from preview_mob_geometry import collect

cases=(('build_forest_foe_individual_art',1,0),('build_forest_foe_more_art',1,6),
       ('build_desert_foe_art',2,1),('build_desert_foe_art',2,7),('build_desert_foe_art',2,10),
       ('build_ice_foe_art',3,3),('build_ice_foe_art',3,4),('build_ice_foe_art',3,11),
       ('build_storm_foe_art',4,2),('build_storm_foe_art',4,5),
       ('build_underworld_foe_art',5,3),('build_underworld_foe_art',5,9),
       ('build_sky_foe_more_art',6,4),('build_sky_foe_more_art',6,5),('build_sky_foe_more_art',6,7),
       ('build_clockwork_foe_more_art',7,8),('build_clockwork_foe_more_art',7,11))

def uvs(model):
    return collections.Counter(json.dumps(c['uv'],sort_keys=True)
        for b in model['bones'] for c in b.get('cubes',[]))

def contact(a,b):
    return all(a['origin'][i]<=b['origin'][i]+b['size'][i]+1e-7 and
               b['origin'][i]<=a['origin'][i]+a['size'][i]+1e-7 for i in range(3))

def joined(b,child,parent):
    assert b[child]['parent']==parent
    assert any(contact(a,c) for a in b[child]['cubes'] for c in b[parent]['cubes']),(child,parent)

for module_name,realm,index in cases:
    mod=importlib.import_module(module_name);name=f'foe_{realm}_{index}'
    refined=mod.build(index)
    # Construct the original bake with the exact same atlas allocator and painter.
    original_refine=mod.refine_baked
    try:
        mod.refine_baked=lambda _name,outputs:outputs
        before=mod.build(index)
    finally:
        mod.refine_baked=original_refine
    for path,payload in refined.items():
        assert path.read_bytes()==payload,(name,path)
        if path.suffix=='.png':assert payload==before[path],(name,path)
    path=next(p for p in refined if p.name==name+'.geo.json')
    model=json.loads(refined[path])['minecraft:geometry'][0]
    original=json.loads(before[path])['minecraft:geometry'][0]
    assert uvs(model)==uvs(original),name
    vertices=[v for quad,_ in collect(model) for v in quad]
    assert min(v[1] for v in vertices)>=-1e-7,name
    b={bone['name']:bone for bone in model['bones']}
    if name=='foe_1_0':
        joined(b,'f1_0_tail_fan','f1_0_tail')
        assert b['f1_0_head']['cubes'][1]['size'][2]==2.2
    if name=='foe_1_6':
        for i in (0,1):
            joined(b,f'f1_6_leg_tip_{i}',f'f1_6_leg_{i}')
            assert b[f'f1_6_leg_{i}']['cubes'][0]['size'][0]==3.5
    if name in ('foe_2_1','foe_2_7','foe_6_7'):
        prefix={'foe_2_1':'f2_1_','foe_2_7':'f2_7_','foe_6_7':'f6_7_'}[name]
        for i in (2,3):joined(b,prefix+f'hock_{i}',prefix+f'leg_{i}')
    if name=='foe_2_7':
        assert b['f2_7_leg_2']['cubes'][0]['size'][0]>b['f2_7_leg_0']['cubes'][0]['size'][0]
    if name in ('foe_2_10','foe_6_5'):
        prefix='f2_10_' if name=='foe_2_10' else 'f6_5_'
        for side in ('l','r'):joined(b,prefix+f'wing_{side}_tip',prefix+f'wing_{side}')
    if name=='foe_3_3':joined(b,'f3_3_chisel','f3_3_head')
    if name=='foe_3_4':joined(b,'f3_4_tail_tip','f3_4_tail_mid')
    if name=='foe_4_2':
        for side in ('l','r'):joined(b,f'f4_2_fist_{side}',f'f4_2_arm_{side}')
    if name=='foe_3_11':
        assert b['f3_11_core']['cubes'][0]['size'][0]==3.6
        for side in ('l','r'):joined(b,f'f3_11_shell_{side}','f3_11_body')
    if name=='foe_4_5':
        for side in ('l','r'):
            joined(b,f'f4_5_wing_{side}_tip',f'f4_5_wing_{side}')
            assert b[f'f4_5_wing_{side}_tip']['cubes'][0]['size'][0]==2.7
    if name=='foe_5_3':
        for side in ('l','r'):joined(b,f'f5_3_mandible_{side}','f5_3_head')
    if name=='foe_5_9':assert b['f5_9_head']['cubes'][1]['size'][0]==5
    if name=='foe_6_4':
        assert b['f6_4_leg_0']['cubes'][0]['size'][0]>b['f6_4_leg_2']['cubes'][0]['size'][0]
        joined(b,'f6_4_tail_tip','f6_4_tail')
    if name=='foe_7_8':
        for side in ('l','r'):joined(b,f'f7_8_hand_{side}',f'f7_8_arm_{side}')
    if name=='foe_7_11':
        for side in ('l','r'):joined(b,f'f7_11_wing_{side}_tip',f'f7_11_wing_{side}')
print('Seventeen cross-realm geometry refinements: UV/PNG unchanged, reproduction and rest joints OK')
