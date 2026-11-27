"""Check direct overrides; cannot reproduce Bedrock's runtime atlas bugs."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack'
atlas=json.loads((root/'textures/terrain_texture.json').read_text())['texture_data']
animated=('fire_0','fire_1','soul_fire_0','soul_fire_1','still_lava','flowing_lava','magma','sea_lantern','still_water','flowing_water')
assert not (set(animated)&set(atlas))
for name in ('fire_0','fire_1','soul_fire_0','soul_fire_1','lava_still','lava_flow','magma','sea_lantern','water_still','water_flow'):
    assert not list((root/'textures/blocks').glob(name+'.*')),name
assert not (root/'textures/flipbook_textures.json').exists()
assert not (root/'blocks.json').exists()
print('No direct fire/lava/magma/water/sea lantern image or flipbook override; rendering unverified')
