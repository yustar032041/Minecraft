"""Thunder and underground shape regressions; static only, not Bedrock."""
import collections,importlib,json,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from preview_mob_geometry import collect

def uv(model):
 return collections.Counter(json.dumps(c['uv'],sort_keys=True) for b in model['bones'] for c in b.get('cubes',[]))
def overlap(a,b):
 return all(a['origin'][i]<=b['origin'][i]+b['size'][i]+1e-7 and b['origin'][i]<=a['origin'][i]+a['size'][i]+1e-7 for i in range(3))
def join(b,child,parent):
 assert b[child]['parent']==parent,(child,parent)
 assert any(overlap(a,c) for a in b[child]['cubes'] for c in b[parent]['cubes']),(child,parent)
models={}
for realm,module in ((4,'build_storm_foe_art'),(5,'build_underworld_foe_art')):
 mod=importlib.import_module(module)
 for index in range(12):
  name=f'foe_{realm}_{index}';refined=mod.build(index)
  previous=mod.refine_baked
  try:
   mod.refine_baked=lambda _name,outputs:outputs
   before=mod.build(index)
  finally:mod.refine_baked=previous
  for path,data in refined.items():
   assert path.read_bytes()==data,(name,path)
   if path.suffix=='.png':assert data==before[path],(name,path)
  geo=next(p for p in refined if p.name==name+'.geo.json')
  model=json.loads(refined[geo])['minecraft:geometry'][0];models[name]={b['name']:b for b in model['bones']}
  assert uv(model)==uv(json.loads(before[geo])['minecraft:geometry'][0]),name
  vertices=[v for quad,_ in collect(model) for v in quad]
  assert min(v[1] for v in vertices)>=-1e-7,name
  b=models[name];p=f'f{realm}_{index}_'
  if name in ('foe_4_9','foe_5_11'):
   for i in range(2):join(b,p+f'talon_{i}',p+f'leg_{i}')
  if name=='foe_4_11':
   for i in (2,3):join(b,p+f'hock_{i}',p+f'leg_{i}')
  if name in ('foe_4_1','foe_4_11','foe_5_5','foe_5_11'):
   for side in ('l','r'):join(b,p+f'wing_{side}_tip',p+f'wing_{side}')
  if name=='foe_5_0':join(b,p+'tail',p+'abdomen')
  if name=='foe_5_1':
   for i in (0,1):join(b,p+f'tip_{i}',p+f'leg_{i}')
  if name=='foe_5_6':
   for i in (6,7):join(b,p+f'tip_{i}',p+f'leg_{i}')
  if name=='foe_5_8':
   for side in ('l','r'):join(b,p+'jaw_'+side,p+'head')
def cube(name,bone,index=0):return models[name][bone]['cubes'][index]
assert cube('foe_4_1','f4_1_wing_l_tip')['size'][0]>cube('foe_4_5','f4_5_wing_l_tip')['size'][0]
assert cube('foe_4_10','f4_10_shield')['size'][0]>cube('foe_4_8','f4_8_body',2)['size'][0]
assert cube('foe_5_1','f5_1_body',1)['size'][0]>cube('foe_5_6','f5_6_body',1)['size'][0]
assert cube('foe_5_5','f5_5_wing_l')['size'][0]>cube('foe_5_11','f5_11_wing_l')['size'][0]
print('24 thunder and underground foes: PNG/UV unchanged, selected joints, floor and regeneration verified (static only)')
