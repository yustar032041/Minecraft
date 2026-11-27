"""Static asset links for the new swords; not a Bedrock rendering test."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0'
bp=root/'BehaviorPack';rp=root/'ResourcePack'
load=lambda path:json.loads(path.read_text(encoding='utf8'))
rc=load(rp/'render_controllers/warden_sword.render_controllers.json')['render_controllers']
assert 'controller.render.hakkai.warden_sword' in rc
geometries=set();textures=set()
for i in range(8):
 key=f'warden_sword_{i}';ident=f'hakkai:{key}'
 entity=load(bp/f'entities/{key}.json')['minecraft:entity'];components=entity['components'];props=entity['description']['properties']
 assert entity['description']['identifier']==ident
 assert 'minecraft:health' not in components and 'minecraft:loot' not in components and 'minecraft:boss' not in components
 assert components['minecraft:damage_sensor']['triggers']=={'cause':'all','deals_damage':'no'}
 assert not components['minecraft:physics']['has_gravity'] and not components['minecraft:physics']['has_collision']
 assert props['hakkai:held']['client_sync'] and props['hakkai:blade_state']['client_sync']
 client=load(rp/f'entity/{key}.entity.json')['minecraft:client_entity']['description']
 assert client['identifier']==ident and client['render_controllers']==['controller.render.hakkai.warden_sword']
 geometry=load(rp/f'models/entity/{key}.geo.json')['minecraft:geometry'][0]
 assert client['geometry']['default']==geometry['description']['identifier']
 geometries.add(json.dumps(geometry['bones'],sort_keys=True))
 assert (rp/(client['textures']['default']+'.png')).exists();textures.add((rp/(client['textures']['default']+'.png')).read_bytes())
 anim=load(rp/f'animations/{key}.animation.json')['animations']
 assert set(client['animations'].values()) <= set(anim)
 assert anim[client['animations']['held']]['bones']['weapon']['scale']==[0,0,0]
 assert len(geometry['bones'][0]['cubes'])>=8
 assert f'entity.{ident}.name=' in (rp/'texts/ja_JP.lang').read_text(encoding='utf8')
assert len(geometries)==len(textures)==8
print('Eight sword asset links and distinct models/textures OK (static only)')
