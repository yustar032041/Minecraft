"""Static links for the liquid network; does not validate engine behavior."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=root/'BehaviorPack';rp=root/'ResourcePack'
def load(p):return json.loads(p.read_text(encoding='utf8'))
atlas=load(rp/'textures/terrain_texture.json')['texture_data']
names=['fluid_tank','fluid_pipe','fluid_pump','fluid_pump_west','fluid_pump_north','fluid_pump_south','fluid_pump_up','fluid_pump_down','fluid_loader','fluid_basin','gear_up_y','gear_down_y','gear_up_z','gear_down_z']
for name in names:
 b=load(bp/f'blocks/{name}.json')['minecraft:block'];assert b['description']['identifier']=='hakkai:'+name
 assert (bp/f'recipes/{name}.json').exists() and (bp/f'loot_tables/hakkai/blocks/{name}.json').exists()
 assert f'tile.hakkai:{name}.name=' in (rp/'texts/ja_JP.lang').read_text(encoding='utf8')
 for c in [b['components']]+[p['components'] for p in b.get('permutations',[])]:
  for m in c.get('minecraft:material_instances',{}).values():
   tex=atlas[m['texture']]['textures'];assert (rp/f'{tex}.png').exists(),name
b=load(bp/'blocks/fluid_tank.json')['minecraft:block'];assert b['description']['states']=={'hakkai:level':list(range(9)),'hakkai:fluid':[0,1,2]};assert len(b['permutations'])==16
assert 'minecraft:tick' not in b['components']
assert 'minecraft:tick' not in load(bp/'blocks/fluid_pipe.json')['minecraft:block']['components']
for name in names:
 if name.startswith('fluid_pump') or name in ('fluid_loader','fluid_basin'):
  assert 'hakkai:factory' in load(bp/f'blocks/{name}.json')['minecraft:block']['components']
print('Liquid/gear assets, state range, materials, ticking, recipes and loot OK (static)')
