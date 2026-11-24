import json
from pathlib import Path
r=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=r/'BehaviorPack';rp=r/'ResourcePack'
def read(p):return json.loads(p.read_text(encoding='utf8'))
atlas=read(rp/'textures/terrain_texture.json')['texture_data'];all_recipes={}
for path in (bp/'recipes').glob('*.json'):
 j=read(path).get('minecraft:recipe_shapeless');
 if j:
  key=tuple(sorted(json.dumps(x,sort_keys=True) for x in j['ingredients']));all_recipes.setdefault(key,[]).append(path.stem)
names=['farm_harvester','farm_fertilizer','farm_planter','item_duct','item_extractor','item_extractor_west','item_extractor_north','item_extractor_south','item_extractor_up','item_extractor_down']
for name in names:
 b=read(bp/f'blocks/{name}.json')['minecraft:block'];assert b['description']['identifier']=='hakkai:'+name
 recipe=read(bp/f'recipes/{name}.json')['minecraft:recipe_shapeless'];key=tuple(sorted(json.dumps(x,sort_keys=True) for x in recipe['ingredients']));assert all_recipes[key]==[name],(name,all_recipes[key])
 assert (bp/f'loot_tables/hakkai/blocks/{name}.json').exists();assert f'tile.hakkai:{name}.name=' in (rp/'texts/ja_JP.lang').read_text(encoding='utf8')
 for c in [b['components']]+[p['components'] for p in b.get('permutations',[])]:
  for m in c.get('minecraft:material_instances',{}).values():assert (rp/(atlas[m['texture']]['textures']+'.png')).exists()
 if name=='item_duct':assert 'hakkai:factory' not in b['components'] and 'minecraft:tick' not in b['components']
 else:assert b['components']['hakkai:factory']=={} and 'minecraft:tick' in b['components']
print('Farm machines and branching item ducts: recipes, assets and tick links OK (static)')
