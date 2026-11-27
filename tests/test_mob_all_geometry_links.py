"""139 realm and patrol rigs (excluding the eight-realm king and protected characters): coarse static duplicate and orphan-bone scan.

AABB overlap is not proof of real contact, texture quality, animation or
Bedrock rendering. Floating effects may need an explicit exception if authored.
"""
import json, math, sys
from collections import defaultdict
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from preview_mob_geometry import collect, RP
names=([f'foe_{r}_{i}' for r in range(8) for i in range(12)] +
       [f'wild_{r}_{i}' for r in range(8) for i in range(3)] +
       [f'guardian_{i}' for i in range(8)] + [f'ender_{i}' for i in range(8)] +
       ['village_archer','village_mage','village_watch'])
assert len(names)==139 and len(set(names))==139
layouts=defaultdict(list);orphans=[];isolated_cubes=[]
for name in names:
    model=json.loads((RP/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0]
    bones={b['name']:b for b in model['bones']}
    layout=tuple(sorted((tuple(round(v,3) for v in c['origin']),tuple(round(v,3) for v in c['size'])) for b in model['bones'] for c in b.get('cubes',[])))
    layouts[layout].append(name)
    boxes={};cube_boxes=[]
    for bone in model['bones']:
        if not bone.get('cubes'):continue
        chain=[];current=bone;seen=set()
        while current:
            assert current['name'] not in seen,(name,current['name']);seen.add(current['name'])
            chain.append({**current,'cubes':current.get('cubes',[]) if current is bone else []})
            parent=current.get('parent');assert not parent or parent in bones,(name,parent)
            current=bones.get(parent)
        points=[v for quad,_ in collect({'bones':chain}) for v in quad]
        boxes[bone['name']]=[(min(v[i] for v in points),max(v[i] for v in points)) for i in range(3)]
        for cube in bone['cubes']:
            parts=[{**item,'cubes':[cube] if item['name']==bone['name'] else []} for item in chain]
            vertices=[v for quad,_ in collect({'bones':parts}) for v in quad]
            cube_boxes.append((bone['name'],[(min(v[i] for v in vertices),max(v[i] for v in vertices)) for i in range(3)]))
    for i,(bone,a) in enumerate(cube_boxes):
        distances=[math.sqrt(sum(max(0,x[0]-y[1],y[0]-x[1])**2 for x,y in zip(a,c))) for j,(_,c) in enumerate(cube_boxes) if j!=i]
        if distances and min(distances)>.4:isolated_cubes.append((name,bone,i,min(distances)))
    for bone in model['bones']:
        if not bone.get('parent') or bone['name'] not in boxes:continue
        a=boxes[bone['name']];distances=[]
        for other,c in boxes.items():
            if other==bone['name']:continue
            distances.append(math.sqrt(sum(max(0,x[0]-y[1],y[0]-x[1])**2 for x,y in zip(a,c))))
        if distances and min(distances)>.25:orphans.append((name,bone['name'],min(distances)))
assert not orphans,orphans
assert not isolated_cubes,isolated_cubes
assert not [v for v in layouts.values() if len(v)>1], 'identical cube origins and sizes'
print('139 realm and patrol rigs (excluding the eight-realm king and protected characters): no isolated child/cube AABBs or exactly duplicated cube layouts (static only)')
