"""Static bootstrap check; engine availability / machine outputs require Bedrock QA."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/BehaviorPack'
prefixes=('factory_pipe','farm_','fluid_','gantry','gear_up','gear_down','item_extractor')
exact={'assembler','bearing','clutch','compressor','conveyor','crusher','filter_router','item_duct','kiln','mill','miner','mixer','press','saw','shaft','sorter','washer','water_wheel','wind_rotor'}
ids={'hakkai:'+p.stem for p in (root/'blocks').glob('*.json') if p.stem in exact or p.stem.startswith(prefixes)}
assert len(ids)>=60
recipes={}
for p in (root/'recipes').glob('*.json'):
 j=json.loads(p.read_text());r=j.get('minecraft:recipe_shapeless')
 if r and r['result']['item'] in ids:
  ingredients=[i['item'] for i in r['ingredients']]
  # No realm-only intermediates, even in an alternate machine recipe.
  assert all(i.startswith('minecraft:') or i in ids for i in ingredients),(p,ingredients)
  recipes.setdefault(r['result']['item'],[]).append(ingredients)
assert ids==set(recipes), ids-set(recipes)
reachable=set()
while True:
 new={out for out,alts in recipes.items() if any(all(i.startswith('minecraft:') or i in reachable for i in inputs) for inputs in alts)}
 if new<=reachable:break
 reachable|=new
assert reachable==ids,ids-reachable
print(f'Industrial crafting: {len(ids)} blocks reachable from vanilla/industry ingredients, no recipe cycles (static)')
