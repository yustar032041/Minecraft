"""Static default-texture UV checks; not a visual or Bedrock rendering test."""
import json
import math
from pathlib import Path
from PIL import Image

rp = Path(__file__).resolve().parents[1] / 'Hakkai_v7.1.0/ResourcePack'
geometry = {}
for file in (rp / 'models').rglob('*.json'):
    for model in json.loads(file.read_text(encoding='utf8')).get('minecraft:geometry', []):
        identifier = model['description']['identifier']
        assert identifier not in geometry, identifier
        geometry[identifier] = model
entities = faces = 0
for file in (rp / 'entity').glob('*.json'):
    desc = json.loads(file.read_text(encoding='utf8'))['minecraft:client_entity']['description']
    if desc['identifier'] == 'hakkai:time_warden':
        # Form/blade arrays and part visibility are checked separately in
        # test_warden_visual_assets.py; there is no single default texture.
        continue
    model = geometry[desc['geometry']['default']]
    texture = rp / (desc['textures']['default'] + '.png')
    with Image.open(texture) as image:
        alpha = image.convert('RGBA').getchannel('A')
        width, height = image.size
        expected_width = model['description']['texture_width']
        expected_height = model['description']['texture_height']
        for bone in model.get('bones', []):
            for cube in bone.get('cubes', []):
                uv = cube.get('uv')
                if not isinstance(uv, dict):
                    continue # Box UV is verified by dedicated model tests.
                for face, data in uv.items():
                    x, y = data['uv']
                    dx, dy = data['uv_size']
                    x0, x1 = sorted((x, x + dx))
                    y0, y1 = sorted((y, y + dy))
                    assert 0 <= x0 <= x1 <= expected_width and 0 <= y0 <= y1 <= expected_height, (file, bone['name'], face)
                    if dx and dy:
                        crop = alpha.crop((math.floor(x0*width/expected_width), math.floor(y0*height/expected_height),
                                           math.ceil(x1*width/expected_width), math.ceil(y1*height/expected_height)))
                        assert crop.getbbox() is not None, (file, bone['name'], face)
                    faces += 1
    entities += 1
assert entities >= 161 and faces >= 21000, (entities, faces)
print(f'{entities} default entity models: {faces} face UVs in bounds and nonempty; Bedrock rendering unverified')
