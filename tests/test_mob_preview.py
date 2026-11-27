"""Rest-pose diagnostic and targeted physical connection regression checks.

AABB contact is deliberately limited to unrotated nearby parent/sibling cubes;
it is not a proof of engine appearance, connectivity or animation quality.
"""
import json, sys
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from preview_mob_geometry import collect, draw_face, point, render, translate
RP=ROOT/'Hakkai_v7.1.0/ResourcePack'

def touches(a,b):
    return all(a['origin'][i] <= b['origin'][i]+b['size'][i]+1e-7 and
               b['origin'][i] <= a['origin'][i]+a['size'][i]+1e-7 for i in range(3))

def model(name):
    return json.loads((RP/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0]

assert point(translate([1,2,3]),(4,5,6))==(5,7,9)
uv={f:{'uv':[0,0],'uv_size':[8,8]} for f in ('north','south','east','west','up','down')}
cube={'origin':[0,0,0],'size':[4,4,4],'uv':uv}
example={'bones':[{'name':'root','pivot':[0,0,0],'cubes':[cube]}]}
assert len(collect(example))==6
im=render(example,Image.new('RGBA',(8,8),(240,80,40,255)),100)
for x,y in ((0,0),(100,0),(0,100),(100,100)):
    assert sum(1 for p in im.crop((x,y,x+100,y+100)).getdata() if p==(240,80,40))>100
# Parent rotation must propagate to child, and malformed graphs must fail.
example['bones'].append({'name':'child','parent':'root','pivot':[0,0,0],'cubes':[cube]})
example['bones'][0]['rotation']=[0,0,90]
verts=collect(example)[6][0]
assert abs(verts[0][0]+4)<1e-6 and abs(verts[0][1]-4)<1e-6
for bones in ([{'name':'a','parent':'missing'}],[{'name':'a','parent':'b'},{'name':'b','parent':'a'}]):
    try: collect({'bones':bones})
    except ValueError: pass
    else: raise AssertionError('invalid hierarchy accepted')
# Signed face UVs and texture alpha must work for a visible face.
texture=Image.new('RGBA',(8,8),(0,0,0,0)); texture.putpixel((2,2),(3,200,20,255))
canvas=Image.new('RGBA',(20,20),(0,0,0,0))
draw_face(canvas,[(0,0),(16,0),(16,16),(0,16)],{'uv':[8,0],'uv_size':[-8,8]},texture)
assert canvas.getbbox() is not None and canvas.getpixel((1,1))[3]==0

names=[f'foe_0_{i}' for i in range(12)]+[f'foe_1_{i}' for i in range(12)]+[f'foe_2_{i}' for i in range(12)]+[f'foe_3_{i}' for i in range(12)]+[f'foe_4_{i}' for i in range(12)]+[f'foe_5_{i}' for i in range(12)]+[f'foe_6_{i}' for i in range(12)]+[f'foe_7_{i}' for i in range(12)]+['eclipse_colossus','village_archer','village_mage','village_watch']+[f'guardian_{i}' for i in range(8)]+[f'ender_{i}' for i in range(8)]+[f'wild_{r}_{i}' for r in range(8) for i in range(3)]
for name in names:
    m=model(name); bones={b['name']:b for b in m['bones']}
    assert collect(m), name
    for bone in m['bones']:
        parent=bones.get(bone.get('parent'));cubes=bone.get('cubes',[])
        # Cubes on the same rigid bone must form a connected component in the
        # unrotated local model. This does not check rotated cube connectivity.
        if cubes and all(not c.get('rotation') for c in cubes):
            connected={0}
            while True:
                expanded=connected | {j for j,c in enumerate(cubes) if any(touches(c,cubes[i]) for i in connected)}
                if expanded==connected: break
                connected=expanded
            assert len(connected)==len(cubes),(name,bone['name'],'disconnected cubes')
        if not parent or not cubes or bone.get('rotation') or parent.get('rotation'): continue
        candidates=parent.get('cubes',[])+[c for b in m['bones'] if b is not bone and b.get('parent')==bone['parent'] and not b.get('rotation') for c in b.get('cubes',[])]
        if candidates: assert any(touches(a,b) for a in cubes for b in candidates),(name,bone['name'])
# Explicit regressions found while inspecting the diagnostic from four angles.
for i in (5,9):
    head=next(b for b in model(f'foe_0_{i}')['bones'] if b['name']==f'f0_{i}_head')
    assert len(head['cubes'])==2
head=next(b for b in model('foe_0_7')['bones'] if b['name']=='f0_7_head')
assert touches(head['cubes'][4],head['cubes'][2]) and touches(head['cubes'][4],head['cubes'][3])
# The rotated tail of the grassland thin-wing creature meets the body at its
# own hinge, rather than appearing connected only through an unrelated wing.
thin={b['name']:b for b in model('foe_0_11')['bones']}
body,tail=thin['f0_11_body']['cubes'][0],thin['f0_11_tail']
assert tail['parent']=='f0_11_body' and tail['rotation']==[-20,0,0]
assert tail['pivot'][2]==body['origin'][2]+body['size'][2]==tail['cubes'][0]['origin'][2]
assert touches(body,tail['cubes'][0])
for side in ('l','r'):
    wing=thin[f'f0_11_wing_{side}']
    for i in (0,1):
        lobe=thin[f'f0_11_wing_{side}_detail_{i}']
        assert lobe['parent']==wing['name'] and touches(wing['cubes'][0],lobe['cubes'][0])
        assert lobe['cubes'][0]['size']==[4,.7,4]
    assert thin[f'f0_11_wing_{side}_detail_0']['cubes'][0]['origin'][2]<wing['cubes'][0]['origin'][2]
    assert thin[f'f0_11_wing_{side}_detail_1']['cubes'][0]['origin'][2]>wing['cubes'][0]['origin'][2]
g={b['name']:b for b in model('guardian_6')['bones']}
assert all(touches(g['g6_body']['cubes'][0],g[f'g6_wing_{side}']['cubes'][0]) for side in ('l','r'))
print(f'{len(names)} prototype rest-pose geometries, preview and targeted attachment regressions OK (not engine validation)')
