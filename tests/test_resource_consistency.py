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
