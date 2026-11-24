import json
from pathlib import Path
r=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=r/'BehaviorPack';rp=r/'ResourcePack'
def read(p):return json.loads(p.read_text(encoding='utf8'))
n='gantry_harvester';block=read(bp/f'blocks/{n}.json')['minecraft:block'];atlas=read(rp/'textures/terrain_texture.json')['texture_data'];assert block['description']['identifier']=='hakkai:'+n
assert 'minecraft:tick' not in block['components'] and 'hakkai:factory' not in block['components']
t=block['components']['minecraft:material_instances']['*']['texture'];assert (rp/(atlas[t]['textures']+'.png')).is_file()
recipe=read(bp/f'recipes/{n}.json')['minecraft:recipe_shapeless'];assert recipe['result']['item']=='hakkai:'+n
key=sorted(x['item'] for x in recipe['ingredients']);matches=[]
for p in (bp/'recipes').glob('*.json'):
 j=read(p).get('minecraft:recipe_shapeless');
 if j and all('item' in x for x in j['ingredients']) and sorted(x['item'] for x in j['ingredients'])==key:matches.append(p.stem)
assert matches==[n],matches
assert (bp/f'loot_tables/hakkai/blocks/{n}.json').is_file()
for lang in ['ja_JP','en_US']:assert f'tile.hakkai:{n}.name=' in (rp/f'texts/{lang}.lang').read_text(encoding='utf8')
print('Inert mobile harvester head assets, unique recipe and loot OK (static)')
