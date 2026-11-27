"""Verify explicit client texture paths, not client rendering or network delivery."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RP = ROOT / 'Hakkai_v7.1.0/ResourcePack'
VANILLA = json.loads((ROOT / 'tests/fixtures/vanilla_resource_keys.json').read_text(encoding='utf8'))
assert VANILLA['revision'] == '15701fa9c13923f12662984c32c124327e40e3d3'
vanilla_paths = set(VANILLA['resource_paths'])
local_paths = {p.relative_to(RP).as_posix() for p in RP.rglob('*') if p.is_file()}


def resolves(texture, local, vanilla):
    if not isinstance(texture, str) or not texture.startswith('textures/'):
        return False
    if any(part in ('', '.', '..') for part in texture.split('/')) or '\\' in texture:
        return False
    return any(texture + ext in local or texture + ext in vanilla for ext in ('.png', '.tga', '.jpg'))


def nested_texture_paths(value):
    if isinstance(value, dict):
        for key, item in value.items():
            if key == 'texture' and isinstance(item, str) and item.startswith('textures/'):
                yield item
            yield from nested_texture_paths(item)
    elif isinstance(value, list):
        for item in value:
            yield from nested_texture_paths(item)


# Failure injection verifies missing paths, traversal and case mismatches are
# not silently accepted. Vanilla paths are intentionally case-sensitive here.
assert resolves('textures/hakkai/test', {'textures/hakkai/test.png'}, set())
assert resolves('textures/misc/glint', set(), {'textures/misc/glint.png'})
assert not resolves('textures/hakkai/test', set(), set())
assert not resolves('textures/../test', {'test.png'}, set())
assert not resolves('textures/Hakkai/test', {'textures/hakkai/test.png'}, set())

refs = []
for folder, root_key in (('entity', 'minecraft:client_entity'), ('attachables', 'minecraft:attachable')):
    for file in sorted((RP / folder).glob('*.json')):
        desc = json.loads(file.read_text(encoding='utf8'))[root_key]['description']
        for alias, texture in desc.get('textures', {}).items():
            refs.append((file.relative_to(RP), alias, texture))

for folder in ('ui', 'particles'):
    for file in sorted((RP / folder).rglob('*.json')):
        value = json.loads(file.read_text(encoding='utf8'))
        refs.extend((file.relative_to(RP), 'texture', texture) for texture in nested_texture_paths(value))

assert refs, 'No client texture references found'
missing = [entry for entry in refs if not resolves(entry[2], local_paths, vanilla_paths)]
assert not missing, '\n'.join(map(str, missing))
print(f'{len(refs)} explicit entity, attachable, UI and particle texture references resolve locally or in pinned vanilla; rendering unverified')
