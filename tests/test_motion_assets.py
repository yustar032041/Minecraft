import json
from pathlib import Path
r=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=r/'BehaviorPack';rp=r/'ResourcePack'
def read(p):return json.loads(p.read_text(encoding='utf8'))
atlas=read(rp/'textures/terrain_texture.json')['texture_data']
for name in ['bearing','gantry_joint','gantry_joint_west','gantry_joint_north','gantry_joint_south','gantry_joint_up','gantry_joint_down']:
 b=read(bp/f'blocks/{name}.json')['minecraft:block'];assert b['description']['identifier']=='hakkai:'+name
 assert (bp/f'recipes/{name}.json').exists() and (bp/f'loot_tables/hakkai/blocks/{name}.json').exists()
 assert f'tile.hakkai:{name}.name=' in (rp/'texts/ja_JP.lang').read_text(encoding='utf8')
 texture=b['components']['minecraft:material_instances']['*']['texture'];assert (rp/(atlas[texture]['textures']+'.png')).exists()
 if name=='bearing':assert b['components']['hakkai:bearing']=={} and b['description']['states']=={'hakkai:angle':[0,1,2,3],'hakkai:motion':[0,1,2]}
 else:assert 'minecraft:tick' not in b['components'] and 'hakkai:bearing' not in b['components']
print('Bearing and six directional joints: assets, links, recipes and state OK (static)')
