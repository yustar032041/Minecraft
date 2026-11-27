"""Desert and ice foes: regenerated static shape regressions, not engine tests."""
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
for realm,module in ((2,'build_desert_foe_art'),(3,'build_ice_foe_art')):
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
  if name=='foe_2_4':
   for i in range(4):join(b,p+f'pad_{i}',p+f'leg_{i}')
  if name=='foe_2_9':
   for i in range(4):join(b,p+f'paw_{i}',p+f'leg_{i}')
  if name=='foe_2_6':
   for side in ('l','r'):join(b,p+'jaw_'+side,p+'head')
   for i in (2,3,4,5):join(b,p+f'leg_tip_{i}',p+f'leg_{i}')
  if name=='foe_3_0':
   for i in range(2):join(b,p+f'talon_{i}',p+f'leg_{i}')
  if name in ('foe_2_5','foe_3_1','foe_3_5','foe_3_9'):
   for side in ('l','r'):join(b,p+f'wing_{side}_tip',p+f'wing_{side}')
  if name in ('foe_2_2','foe_2_11'):
   for side in ('l','r'):join(b,p+f'forearm_{side}',p+f'arm_{side}')
  if name=='foe_3_2':
   for side in ('l','r'):join(b,p+f'fist_{side}',p+f'arm_{side}')
# Compare physical proportions, not merely names or image colors.
def cube(name,bone,index=0):return models[name][bone]['cubes'][index]
assert cube('foe_2_3','f2_3_shell_l')['size'][0]>cube('foe_2_0','f2_0_shell_l')['size'][0]
assert cube('foe_2_11','f2_11_forearm_l')['size'][0]>cube('foe_2_2','f2_2_forearm_l')['size'][0]
assert cube('foe_3_0','f3_0_body')['size'][0]>cube('foe_3_9','f3_9_body')['size'][0]
assert cube('foe_3_1','f3_1_wing_l_tip')['size'][0]>cube('foe_3_5','f3_5_wing_l_tip')['size'][0]
print('24 desert and ice foes: generated PNG/UV unchanged, selected joints and floor verified (static only)')
