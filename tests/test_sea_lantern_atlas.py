"""Preserve the vanilla animated texture instead of supplying a replacement."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack'
atlas=json.loads((root/'textures/terrain_texture.json').read_text())['texture_data']
assert atlas['sea_lantern']=={'textures':'textures/blocks/sea_lantern'}
assert not (root/'textures/blocks/sea_lantern.png').exists()
assert not (root/'textures/blocks/sea_lantern.texture_set.json').exists()
assert not (root/'textures/flipbook_textures.json').exists()
assert all(k=='sea_lantern' or k.startswith('hakkai_') for k in atlas)
print('Sea lantern points to the default vanilla atlas texture; no local animation/image override (static)')
