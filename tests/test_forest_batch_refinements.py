"""Forest batch and three cross-realm hare refinements: static tests, not Bedrock."""
import collections, importlib, json, sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from preview_mob_geometry import collect

cases=[('build_forest_foe_individual_art',1,i) for i in (1,2)] + [
 ('build_forest_foe_more_art',1,i) for i in (3,4,5,7,8,9,10,11)] + [
 ('build_ice_foe_art',3,6),('build_ice_foe_art',3,7),
 ('build_storm_foe_art',4,6),('build_storm_foe_art',4,7),('build_underworld_foe_art',5,7)]

def uv(model):
 return collections.Counter(json.dumps(c['uv'],sort_keys=True) for b in model['bones'] for c in b.get('cubes',[]))
def overlap(a,b):
 return all(a['origin'][i]<=b['origin'][i]+b['size'][i]+1e-7 and b['origin'][i]<=a['origin'][i]+a['size'][i]+1e-7 for i in range(3))
def join(b,child,parent):
 assert b[child]['parent']==parent,(child,parent)
 assert any(overlap(a,c) for a in b[child]['cubes'] for c in b[parent]['cubes']),(child,parent)
for module,realm,index in cases:
 mod=importlib.import_module(module);name=f'foe_{realm}_{index}';refined=mod.build(index)
 previous=mod.refine_baked
 try:
  mod.refine_baked=lambda _name,outputs:outputs
  before=mod.build(index)
 finally:mod.refine_baked=previous
 for path,data in refined.items():
  assert path.read_bytes()==data,(name,path)
  if path.suffix=='.png':assert data==before[path],(name,path)
 geo=next(p for p in refined if p.name==name+'.geo.json')
 model=json.loads(refined[geo])['minecraft:geometry'][0]
 assert uv(model)==uv(json.loads(before[geo])['minecraft:geometry'][0]),name
 vertices=[v for quad,_ in collect(model) for v in quad]
 assert min(v[1] for v in vertices)>=-1e-7,name
 bones={b['name']:b for b in model['bones']}
 if name=='foe_1_3':
  for i in range(6):join(bones,f'f1_3_foot_{i}',f'f1_3_leg_{i}')
 if name in ('foe_1_7','foe_3_7','foe_4_7','foe_5_7'):
  for i in (2,3):join(bones,f'f{realm}_{index}_hock_{i}',f'f{realm}_{index}_leg_{i}')
 if name=='foe_3_7':join(bones,'f3_7_tail','f3_7_body')
 if name in ('foe_1_1','foe_1_5','foe_1_9'):
  for side in ('l','r'):join(bones,f'f1_{index}_wing_{side}_tip',f'f1_{index}_wing_{side}')
 if name=='foe_1_4':
  join(bones,'f1_4_tail_mid','f1_4_tail');join(bones,'f1_4_tail_tip','f1_4_tail_mid')
 if name=='foe_1_11':
  for i in (6,7):join(bones,f'f1_11_leg_tip_{i}',f'f1_11_leg_{i}')
 if name=='foe_3_6':
  for side in ('l','r'):join(bones,f'f3_6_jaw_{side}','f3_6_head')
  for i in (4,5,6,7):join(bones,f'f3_6_leg_tip_{i}',f'f3_6_leg_{i}')
 if name=='foe_4_6':
  join(bones,'f4_6_electrode','f4_6_spinner')
  for i in (0,1,2,3):join(bones,f'f4_6_leg_tip_{i}',f'f4_6_leg_{i}')
# Structural distinctions, beyond different texture names.
def model(name):return json.loads((root/f'Hakkai_v7.1.0/ResourcePack/models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0]
def bone(m,n):return next(b for b in m['bones'] if b['name']==n)
moth=model('foe_1_1');bird=model('foe_1_9')
assert bone(moth,'f1_1_wing_l')['cubes'][0]['size'][0]>bone(moth,'f1_1_wing_l')['cubes'][0]['size'][1]
assert bone(bird,'f1_9_wing_l')['cubes'][0]['size'][1]>bone(bird,'f1_9_wing_l')['cubes'][0]['size'][0]
snow=model('foe_3_7');storm=model('foe_4_7')
assert bone(snow,'f3_7_ear_l')['cubes'][0]['size'][1]<bone(storm,'f4_7_ear_l')['cubes'][0]['size'][1]
assert bone(storm,'f4_7_ear_l')['rotation']!=[0,0,0]
ice=model('foe_3_6');thunder=model('foe_4_6')
assert bone(ice,'f3_6_leg_6')['cubes'][0]['size'][0]>bone(ice,'f3_6_leg_0')['cubes'][0]['size'][0]
assert bone(thunder,'f4_6_leg_0')['cubes'][0]['size'][0]>bone(thunder,'f4_6_leg_6')['cubes'][0]['size'][0]
print('15 forest and cross-realm refinements: PNG/UV unchanged, selected joints, floor and regeneration OK (static only)')
