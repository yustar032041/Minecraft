"""Static audit regression, not engine collision or animation validation."""
import sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'tools'))
from audit_mob_shape_motion import GROUPS, OUTPUT, measure, report, row, selected

cube={'origin':[-4,0,-8],'size':[8,16,16],'uv':{f:{'uv':[0,0],'uv_size':[1,1]} for f in ('north','south','east','west','up','down')}}
assert measure({'bones':[{'name':'body','cubes':[cube]}]})==[(-.25,.25),(0,1),(-.5,.5)]
assert selected({'minecraft:collision_box':{'width':1,'height':2}, 'minecraft:navigation.fly':{}, 'minecraft:health':{'value':5}})=={'minecraft:collision_box':{'width':1,'height':2},'minecraft:navigation.fly':{}}
items=[n for group in GROUPS.values() for n,_ in group]
assert len(items)==len(set(items))==140
assert not {'admin','fushi','fushi_chief'} & set(items)
king=row('eclipse_colossus','王');assert king['box']=='1.5 × 2.8' and king['nav']=='walk'
fox=row('foe_7_10','時');assert fox['box']=='0.7 × 0.9' and '水平はみ出し' in fox['flags'] and 'native_contact' in fox['attack']
for realm in range(8):
 neutral=row(f'wild_{realm}_1','野生'); passive=row(f'wild_{realm}_0','野生')
 assert 'native_contact' in neutral['attack'] and 'native_contact' not in passive['attack']
assert OUTPUT.read_text(encoding='utf8')==report()
print('140-candidate collision, movement and rest-pose audit: reproducible (static only)')
