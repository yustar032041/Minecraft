import json
from pathlib import Path
r=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=r/'BehaviorPack';rp=r/'ResourcePack'
def load(p):return json.loads(p.read_text(encoding='utf8'))
atlas=load(rp/'textures/terrain_texture.json')['texture_data']
for name in ['gantry_frame','gantry_panel','gantry','gantry_west','gantry_north','gantry_south','gantry_up','gantry_down']:
 b=load(bp/f'blocks/{name}.json')['minecraft:block'];assert b['description']['identifier']=='hakkai:'+name
 assert (bp/f'recipes/{name}.json').exists() and (bp/f'loot_tables/hakkai/blocks/{name}.json').exists()
 assert f'tile.hakkai:{name}.name=' in (rp/'texts/ja_JP.lang').read_text(encoding='utf8')
 texture=b['components']['minecraft:material_instances']['*']['texture'];assert (rp/(atlas[texture]['textures']+'.png')).exists()
 if name in ('gantry_frame','gantry_panel'):
  assert 'hakkai:gantry' not in b['components'] and 'minecraft:tick' not in b['components']
 else:
  assert b['components']['hakkai:gantry']=={} and b['description']['states']=={'hakkai:offset':list(range(9)),'hakkai:motion':[0,1,2]}
print('Gantry controller, inert frame/panel, texture, state, recipes and loot links OK (static)')
