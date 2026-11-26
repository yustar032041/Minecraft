"""Verify native creative-inventory egg declarations, not in-game rendering/use."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=root/'BehaviorPack';rp=root/'ResourcePack'
names=[*(f'guardian_{i}' for i in range(8)),'eclipse_colossus','time_warden','fushi_chief']
for name in names:
 ent=json.loads((bp/'entities'/f'{name}.json').read_text())['minecraft:entity']['description']
 client=json.loads((rp/'entity'/f'{name}.entity.json').read_text())['minecraft:client_entity']['description']
 assert ent['identifier']==client['identifier']==f'hakkai:{name}' and ent['is_spawnable'] is True and ent['is_summonable'] is True
 egg=client.get('spawn_egg');assert egg and all(isinstance(egg.get(x),str) and egg[x].startswith('#') for x in ('base_color','overlay_color')),name
 for lang in ('ja_JP','en_US'):
  text=(rp/'texts'/f'{lang}.lang').read_text();key=f'item.spawn_egg.entity.hakkai:{name}.name='
  assert sum(x.startswith(key) for x in text.splitlines())==1,(name,lang)
for path in (bp/'recipes').glob('*.json'):
 raw=path.read_text().lower();assert 'spawn_egg' not in raw,path
for name in ('eclipse_colossus','time_warden'):
 assert not (bp/'items'/f'{name}_spawn_egg.json').exists()
tool=(Path(__file__).resolve().parents[1]/'tools/create_warden_content.py').read_text()
assert "'identifier':'hakkai:time_warden','is_spawnable':True" in tool and "'spawn_egg':{'base_color'" in tool
print('8 guardians, chief, colossus and warden have native creative inventory egg declarations; no spawn egg recipes (static)')
