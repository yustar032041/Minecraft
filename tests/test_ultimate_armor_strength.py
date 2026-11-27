"""Compare declared item values only; actual damage/engine behavior needs Bedrock."""
import ast
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
items=root/'Hakkai_v7.1.0/BehaviorPack/items'
by_slot={}
for path in items.glob('*.json'):
 item=json.loads(path.read_text(encoding='utf8'))['minecraft:item']
 comps=item.get('components',{});wearable=comps.get('minecraft:wearable',{})
 slot=wearable.get('slot','')
 if not slot.startswith('slot.armor.'):continue
 dur=comps.get('minecraft:durability',{}).get('max_durability',0)
 by_slot.setdefault(slot,[]).append((item['description']['identifier'],wearable.get('protection',0),dur))
expected={'helmet':('head',11,1500),'chest':('chest',20,7200),'leggings':('legs',8,1900),'boots':('feet',8,1700)}
for part,(slot,protection,durability) in expected.items():
 entries=by_slot['slot.armor.'+slot];identifier='hakkai:ult_'+part
 own=[(p,d) for id,p,d in entries if id==identifier];assert own==[(protection,durability)]
 others=[(id,p,d) for id,p,d in entries if id!=identifier]
 assert all(protection>=p for _,p,_ in others),(slot,'protection',others)
 assert all(durability>d for _,_,d in others),(slot,'durability',others)
# Inspect the generator without executing it: running it overwrites art files.
tree=ast.parse((root/'tools/create_ultimate_armor.py').read_text(encoding='utf8'))
assignment=next(n for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='parts' for t in n.targets))
parts=ast.literal_eval(assignment.value)
for name,(slot,protection,durability) in expected.items():
 assert (parts[name][0],parts[name][2],parts[name][3])==(slot,protection,durability)
print('Final armor matches per-slot max defined protection and exceeds per-slot defined durability (static only)')
