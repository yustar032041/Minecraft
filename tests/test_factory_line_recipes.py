import json
from pathlib import Path
r=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/BehaviorPack'
source=(r/'scripts/factory_line_recipes.js').read_text(encoding='utf8').splitlines()
lines=json.loads(source[1].removeprefix('export const LINE_RECIPES=').removesuffix(';'))
recycle=json.loads(source[2].removeprefix('export const RECYCLE_DROPS=').removesuffix(';'))
for kind,recipes in lines.items():
 for recipe in recipes:
  craft=json.loads((r/'recipes'/f"{recipe['name']}.json").read_text())['minecraft:recipe_shapeless']
  ingredients={}
  for part in craft['ingredients']:ingredients[part['item']]=ingredients.get(part['item'],0)+1
  assert ingredients=={c['id']:c['count'] for c in recipe['costs']}
  assert recipe['output']==craft['result']['item'] and recipe['amount']==craft['result'].get('count',1)
paths=list((r/'recipes').glob('recycle_drop_*.json'));assert len(paths)==len(recycle)==120
for p in paths:
 recipe=json.loads(p.read_text())['minecraft:recipe_shapeless'];assert recycle[recipe['ingredients'][0]['item']]==recipe['result']['item'];assert recipe['result']['count']==2
print('Automated processing recipes and 120 material mappings match existing crafting recipes (static)')
