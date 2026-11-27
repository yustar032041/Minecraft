"""Sky and station foe shape batch: static tests only, not Bedrock."""
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
for realm,prefix in ((6,'sky'),(7,'clockwork')):
 for index in range(12):
  module=f'build_{prefix}_foe_'+('art' if index<3 else 'more_art')
  mod=importlib.import_module(module);name=f'foe_{realm}_{index}';refined=mod.build(index)
  previous=getattr(mod,'refine_baked',None)
  if previous:
   try:
    mod.refine_baked=lambda _name,outputs:outputs
    before=mod.build(index)
   finally:mod.refine_baked=previous
  else:
   # Unmodified first-three clockwork builder has no postprocessor hook.
   before=refined
  for path,data in refined.items():
   assert path.read_bytes()==data,(name,path)
   if path.suffix=='.png':assert data==before[path],(name,path)
  geo=next(p for p in refined if p.name==name+'.geo.json')
  model=json.loads(refined[geo])['minecraft:geometry'][0];models[name]={b['name']:b for b in model['bones']}
  assert uv(model)==uv(json.loads(before[geo])['minecraft:geometry'][0]),name
  vertices=[v for quad,_ in collect(model) for v in quad]
  assert min(v[1] for v in vertices)>=-1e-7,name
  b=models[name];p=f'f{realm}_{index}_'
  if name=='foe_6_0':
   for i in (2,3):join(b,p+f'hock_{i}',p+f'leg_{i}')
   for side in ('l','r'):join(b,p+f'wing_{side}_tip',p+f'wing_{side}')
  if name in ('foe_6_7','foe_7_7'):
   for i in (2,3):join(b,p+f'hock_{i}',p+f'leg_{i}')
  if name in ('foe_6_9','foe_7_4'):
   join(b,p+'tail_tip',p+'tail_mid');join(b,p+'tail_mid',p+'tail')
  if name=='foe_7_9':
   for i in (2,3):join(b,p+f'hock_{i}',p+f'leg_{i}')
def cube(name,bone,index=0):return models[name][bone]['cubes'][index]
assert cube('foe_6_3','f6_3_shell_l')['size'][0]>cube('foe_7_3','f7_3_shell_l')['size'][0]
assert cube('foe_7_3','f7_3_shell_l')['size'][2]>cube('foe_6_3','f6_3_shell_l')['size'][2]
assert models['foe_6_7']['f6_7_ear_l']['rotation']!=models['foe_7_7']['f7_7_ear_l'].get('rotation',[0,0,0])
print('24 sky and station foes: PNG/UV unchanged, selected joints, floor and regeneration verified (static only)')
