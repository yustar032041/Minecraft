"""Texture-set schema and references. This is not an engine rendering test."""
import json
from pathlib import Path
import re
from PIL import Image

rp = Path(__file__).resolve().parents[1] / 'Hakkai_v7.1.0/ResourcePack'
paths = sorted(rp.rglob('*.texture_set.json'))
assert paths
for path in paths:
    obj = json.loads(path.read_text(encoding='utf8'))
    assert set(obj) == {'format_version', 'minecraft:texture_set'}, path
    ts = obj['minecraft:texture_set']
    assert isinstance(ts, dict) and 'color' in ts, path
    assert not ({'heightmap', 'normal'} <= ts.keys()), path
    assert not ({'metalness_emissive_roughness', 'metalness_emissive_roughness_subsurface'} <= ts.keys()), path
    for key, value in ts.items():
        assert key in {'color', 'normal', 'heightmap', 'metalness_emissive_roughness', 'metalness_emissive_roughness_subsurface'}, (path, key)
        channels = {'color': (3, 4), 'normal': (3, 4), 'heightmap': (1,),
                    'metalness_emissive_roughness': (3, 4), 'metalness_emissive_roughness_subsurface': (4,)}[key]
        if isinstance(value, str) and not value.startswith('#'):
            assert re.fullmatch(r'[a-z0-9_\-]+', value), (path, key, value)
            image = path.parent / (value + '.png')
            assert image.is_file(), (path, key, image)
            with Image.open(image) as im:
                assert len(im.getbands()) in channels, (path, key, im.mode)
                im.verify()
        elif isinstance(value, list):
            assert key in ('color', 'metalness_emissive_roughness', 'metalness_emissive_roughness_subsurface', 'heightmap')
            assert len(value) in ({'color': (4,), 'heightmap': (1,), 'metalness_emissive_roughness': (3,), 'metalness_emissive_roughness_subsurface': (4,)}[key])
            assert all(isinstance(n, int) and 0 <= n <= 255 for n in value)
        else:
            assert isinstance(value, str) and re.fullmatch(r'#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?', value), (path, key, value)
print(f'{len(paths)} texture sets: schema, image references, channels and PNG decoding OK; rendering unverified')

# Used atlas art must not be fully transparent. An invisible *unused* asset
# is not evidence that any block or item currently renders incorrectly.
def texture_paths(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for v in value: yield from texture_paths(v)
    elif isinstance(value, dict):
        for v in value.values(): yield from texture_paths(v)
for name in ('item_texture.json', 'terrain_texture.json'):
    atlas = json.loads((rp / 'textures' / name).read_text(encoding='utf8'))['texture_data']
    for key, value in atlas.items():
        for texture in texture_paths(value['textures']):
            image = rp / (texture + '.png')
            assert image.is_file(), (name, key, texture)
            with Image.open(image) as im:
                assert im.convert('RGBA').getchannel('A').getbbox() is not None, (name, key, texture)
print('All referenced item and terrain atlas images have visible pixels (static only)')
