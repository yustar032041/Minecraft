import json
from pathlib import Path
r=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=r/'BehaviorPack';rp=r/'ResourcePack'
def read(p):return json.loads(p.read_text(encoding='utf8'))
atlas=read(rp/'textures/terrain_texture.json')['texture_data']
for n in ['wind_soil','mist_loam','sun_silt','rime_soil','storm_grit','deep_loam','cloud_loam','epoch_soil']:
 b=read(bp/f'blocks/{n}.json')['minecraft:block'];assert b['description']['identifier']=='hakkai:'+n
 assert b['components']['minecraft:loot']==f'loot_tables/hakkai/blocks/{n}.json'
 loot=read(bp/f'loot_tables/hakkai/blocks/{n}.json');assert loot['pools'][0]['entries'][0]['name']=='hakkai:'+n
 path=rp/(atlas[b['components']['minecraft:material_instances']['*']['texture']]['textures']+'.png');assert path.is_file()
 for lang in ['ja_JP','en_US']:assert f'tile.hakkai:{n}.name=' in (rp/f'texts/{lang}.lang').read_text(encoding='utf8')
print('Eight realm terrain blocks, textures, loot and translations OK (static)')
