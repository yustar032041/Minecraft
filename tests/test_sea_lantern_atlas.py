"""Do not override the vanilla animated sea lantern atlas entry or image."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0'
rp=root/'ResourcePack'
atlas=json.loads((rp/'textures/terrain_texture.json').read_text())['texture_data']
assert 'sea_lantern' not in atlas
assert not (rp/'textures/blocks/sea_lantern.png').exists()
assert not (rp/'textures/blocks/sea_lantern.texture_set.json').exists()
assert not (rp/'textures/flipbook_textures.json').exists()
assert all(k.startswith('hakkai_') for k in atlas)
block=json.loads((root/'BehaviorPack/blocks/warden_arena_light.json').read_text())['minecraft:block']['components']
key=block['minecraft:material_instances']['*']['texture']
assert key=='hakkai_cloudstone' and block['minecraft:light_emission']==15
assert (rp/(atlas[key]['textures']+'.png')).is_file()
print('Vanilla sea lantern is not overridden; arena light uses its own pack texture (static)')
