"""Static checks only: these do not test native timer or client rendering."""
import json, subprocess, sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
pack=root/'Hakkai_v7.1.0';bp=pack/'BehaviorPack/entities';rp=pack/'ResourcePack/entity'
subprocess.run([sys.executable,str(root/'tools/build_king_guardian_assets.py'),'--check'],check=True)
for i in range(8):
 normal=json.loads((bp/f'guardian_{i}.json').read_text())['minecraft:entity']
 special=json.loads((bp/f'king_guardian_{i}.json').read_text())['minecraft:entity']
 nclient=json.loads((rp/f'guardian_{i}.entity.json').read_text())['minecraft:client_entity']['description']
 client=json.loads((rp/f'king_guardian_{i}.entity.json').read_text())['minecraft:client_entity']['description']
 c=special['components'];assert c['minecraft:health']['max']==40<normal['components']['minecraft:health']['max']
 assert c['minecraft:type_family']['family']==['monster','hakkai_king_guardian']
 assert not {'minecraft:loot','minecraft:experience_reward','minecraft:boss'} & c.keys()
 assert special['description']['is_spawnable'] is False
 assert c['minecraft:timer']['time']=={'min':60,'max':60}
 assert client['geometry']==nclient['geometry'] and client['textures']==nclient['textures'] and client['animations']==nclient['animations']
 assert 'spawn_egg' not in client
 for lang in ('ja_JP','en_US'):
  assert f'entity.hakkai:king_guardian_{i}.name=' in (pack/'ResourcePack/texts'/f'{lang}.lang').read_text()
print('8 king guardian assets use approved guardian rigs, isolated family, timer and no normal rewards (static only)')
