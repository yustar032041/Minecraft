"""Static checks for localization encoding and referenced terrain art, not rendering tests."""
import json
from pathlib import Path
root = Path('Hakkai_v7.1.0/ResourcePack')
keys = []
for language in ('ja_JP', 'en_US'):
    raw = (root / 'texts' / f'{language}.lang').read_bytes()
    assert not raw.startswith(b'\xef\xbb\xbf')
    text = raw.decode('utf-8')
    assert '\ufffd' not in text
    entries = [line.split('=', 1)[0] for line in text.splitlines() if '=' in line and not line.startswith('#')]
    assert len(entries) == len(set(entries)), f'duplicate keys in {language}'
    keys.append(set(entries))
assert keys[0] == keys[1], 'language fallback keys should be present in both supported languages'
atlas = json.loads((root / 'textures/terrain_texture.json').read_text(encoding='utf8'))['texture_data']
def paths(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for entry in value: yield from paths(entry)
    elif isinstance(value, dict):
        for entry in value.values(): yield from paths(entry)
for key, item in atlas.items():
    for path in paths(item['textures']):
        assert (root / (path + '.png')).is_file() or (root / (path + '.tga')).is_file(), (key, path)

# Every material instance, including permutations, resolves to our terrain
# atlas. This checks identifiers, not lighting or in-game rendering.
bp = root.parent / 'BehaviorPack'
def material_instances(value):
    if isinstance(value, dict):
        for k, v in value.items():
            if k == 'minecraft:material_instances' and isinstance(v, dict):
                yield v
            yield from material_instances(v)
    elif isinstance(value, list):
        for v in value:
            yield from material_instances(v)
for file in (bp / 'blocks').glob('*.json'):
    for instances in material_instances(json.loads(file.read_text(encoding='utf8'))):
        for side, material in instances.items():
            if isinstance(material, dict) and 'texture' in material:
                assert material['texture'] in atlas, (file, side, material['texture'])

# Invalid bytes and replacement characters in the packed source are not a
# substitute for testing actual Japanese glyph rendering on a device.
for pack in (bp, root):
    for file in pack.rglob('*'):
        if not file.is_file() or file.suffix not in ('.json', '.lang', '.js', '.txt'):
            continue
        raw = file.read_bytes()
        assert not raw.startswith(b'\xef\xbb\xbf'), file
        assert '\ufffd' not in raw.decode('utf8'), file

# These are addon-only atlases. Never reclaim vanilla atlas identifiers or
# font resources as a speculative repair for a rendering problem.
for name in ('terrain_texture.json', 'item_texture.json'):
    data = json.loads((root / 'textures' / name).read_text(encoding='utf8'))['texture_data']
    assert all(key.startswith('hakkai_') for key in data), name
assert not (root / 'font').exists(), 'do not replace vanilla glyphs'
