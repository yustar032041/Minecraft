import json
from pathlib import Path
r=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=r/'BehaviorPack';rp=r/'ResourcePack'
def load(p):return json.loads(p.read_text(encoding='utf8'))
e=load(bp/'entities/kinetic_visual.json')['minecraft:entity']
assert e['description']['identifier']=='hakkai:kinetic_visual'
assert e['description']['properties']['hakkai:rpm']['client_sync']
assert e['description']['properties']['hakkai:kind']['client_sync']
client=load(rp/'entity/kinetic_visual.entity.json')['minecraft:client_entity']['description']
assert client['identifier']==e['description']['identifier']
assert (rp/(client['textures']['default']+'.png')).exists()
g=load(rp/'models/entity/kinetic_visual.geo.json')['minecraft:geometry'][0]
assert g['description']['identifier']==client['geometry']['default']
a=load(rp/'animations/kinetic.animation.json')['animations'][client['animations']['rotate']]
assert set(a['bones'])=={x['name'] for x in g['bones']}
assert all("query.property('hakkai:rpm')" in bone['rotation'][0] for bone in a['bones'].values())
for kind in ('shaft','wind_rotor','water_wheel','gear_up','gear_down'):
 b=load(bp/f'blocks/{kind}.json')['minecraft:block']
 assert b['components']['minecraft:geometry']=='geometry.hakkai.kinetic_base'
 assert b['components']['hakkai:factory']=={}
 assert (bp/f'loot_tables/hakkai/blocks/{kind}.json').exists()
print('3D entity, synced speed, geometry, animation, block housing and recipes statically linked (not a Bedrock render test)')
