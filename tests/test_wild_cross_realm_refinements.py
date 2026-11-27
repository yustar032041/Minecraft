"""Wildlife cross-realm silhouette refinements, static checks only."""
import collections, importlib, json, sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'tools'))
from preview_mob_geometry import collect

cases=(('build_desert_wild_art',2,0),('build_ice_storm_wild_art',3,0),
       ('build_sky_wild_art',6,0),('build_sky_wild_art',6,1),
       ('build_clockwork_wild_art',7,0),('build_clockwork_wild_art',7,1),
       ('build_clockwork_wild_art',7,2))
def uv(model):
    return collections.Counter(json.dumps(c['uv'],sort_keys=True) for b in model['bones'] for c in b.get('cubes',[]))
def contact(a,b):
    return all(a['origin'][i]<=b['origin'][i]+b['size'][i]+1e-7 and b['origin'][i]<=a['origin'][i]+a['size'][i]+1e-7 for i in range(3))
for module,realm,index in cases:
    mod=importlib.import_module(module); name=f'wild_{realm}_{index}'
    build=lambda:mod.build(realm,index) if realm==3 else mod.build(index)
    refined=build(); orig=mod.refine_baked
    try:
        mod.refine_baked=lambda _,out:out
        before=build()
    finally:mod.refine_baked=orig
    for path,data in refined.items():
        assert data==path.read_bytes(),(name,path)
        if path.suffix=='.png':assert data==before[path],path
    path=next(p for p in refined if p.name==name+'.geo.json')
    model=json.loads(refined[path])['minecraft:geometry'][0]
    assert uv(model)==uv(json.loads(before[path])['minecraft:geometry'][0]),name
    assert min(v[1] for q,_ in collect(model) for v in q)>=-1e-7,name
    bones={b['name']:b for b in model['bones']}
    if name in ('wild_2_0','wild_7_0'):
        for i in (2,3):
            h=bones[f'w{realm}_0_hock_{i}']; leg=bones[h['parent']]
            assert leg['name']==f'w{realm}_0_leg_{i}'
            assert any(contact(a,b) for a in h['cubes'] for b in leg['cubes'])
    if name=='wild_6_0':
        for side in ('l','r'):
            tip=bones[f'w6_0_wing_{side}_tip']; wing=bones[tip['parent']]
            assert any(contact(a,b) for a in tip['cubes'] for b in wing['cubes'])
    if name=='wild_7_2':
        for side in ('l','r'):
            arm=bones[f'w7_2_arm_{side}']; hand=bones[f'w7_2_forearm_{side}']
            assert hand['parent']==arm['name'] and any(contact(a,b) for a in hand['cubes'] for b in arm['cubes'])
print('Seven wild refinements: reproduction, UV, PNG, floor and selected rest joints OK (static only)')
