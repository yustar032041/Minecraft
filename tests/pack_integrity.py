"""Static checks; these do not replace importing and playing in Bedrock."""
import json
import pathlib
import struct
import uuid
import zlib

root = pathlib.Path(__file__).resolve().parents[1] / 'Hakkai_v7.1.0'
bp, rp = root / 'BehaviorPack', root / 'ResourcePack'
errors = []

def load(path):
    try:
        return json.loads(path.read_text(encoding='utf-8-sig'))
    except (ValueError, OSError) as exc:
        errors.append(f'{path}: {exc}')
        return {}

for pack in (bp, rp):
    for path in pack.rglob('*.json'):
        load(path)

manifests = [load(bp / 'manifest.json'), load(rp / 'manifest.json')]
seen = set()
for manifest in manifests:
    parts = [manifest.get('header', {}), *manifest.get('modules', [])]
    for part in parts:
        value = part.get('uuid', '')
        try:
            uuid.UUID(value)
        except ValueError:
            errors.append(f'invalid UUID: {value}')
        if value in seen:
            errors.append(f'duplicate manifest UUID: {value}')
        seen.add(value)
        if part.get('version') != [7, 1, 12]:
            errors.append(f'incorrect pack version: {part}')
if not any(d.get('uuid') == manifests[1].get('header', {}).get('uuid') and d.get('version') == [7,1,12]
           for d in manifests[0].get('dependencies', [])):
    errors.append('BP does not reference RP at 7.1.12')

declared_content = set()
for directory in ('items', 'blocks', 'entities', 'recipes', 'features', 'feature_rules'):
    ids = {}
    for path in (bp / directory).glob('*.json'):
        for value in load(path).values():
            if not isinstance(value, dict):
                continue
            desc = value.get('description', {})
            ident = desc.get('identifier') if isinstance(desc, dict) else None
            if ident in ids:
                errors.append(f'duplicate identifier {ident}: {ids[ident]} / {path}')
            if ident:
                ids[ident] = path
                if directory in ('items', 'blocks', 'entities'):
                    declared_content.add(ident)

def custom_item_refs(value):
    if isinstance(value, dict):
        for key, item in value.items():
            if key in ('item', 'name') and isinstance(item, str) and item.startswith('hakkai:'):
                yield item
            else:
                yield from custom_item_refs(item)
    elif isinstance(value, list):
        for item in value:
            yield from custom_item_refs(item)

for folder in ('recipes', 'loot_tables'):
    for path in (bp / folder).rglob('*.json'):
        for ref in custom_item_refs(load(path)):
            if ref not in declared_content:
                errors.append(f'{path}: undefined custom content {ref}')

atlas = load(rp / 'textures/item_texture.json').get('texture_data', {})
for path in (bp / 'items').glob('*.json'):
    item = load(path).get('minecraft:item', {})
    icon = item.get('components', {}).get('minecraft:icon')
    if isinstance(icon, dict):
        icon = icon.get('textures', {}).get('default')
    entry = atlas.get(icon)
    if not entry:
        errors.append(f'{path}: missing item icon {icon}')
        continue
    texture = entry.get('textures')
    if isinstance(texture, str) and not any((rp / (texture + ext)).is_file() for ext in ('.png', '.tga')):
        errors.append(f'{path}: missing texture {texture}')
# Validate every PNG, including CRCs and the IEND marker. A .png extension
# alone is not enough (older assets were accidentally stored as base64 text).
for path in rp.rglob('*.png'):
    try:
        data = path.read_bytes()
        if data[:8] != b'\x89PNG\r\n\x1a\n':
            raise ValueError('invalid PNG signature')
        offset, ended = 8, False
        while offset < len(data):
            if offset + 12 > len(data):
                raise ValueError('truncated PNG chunk')
            length = struct.unpack_from('>I', data, offset)[0]
            end = offset + 12 + length
            if end > len(data):
                raise ValueError('truncated PNG data')
            kind = data[offset+4:offset+8]
            crc = struct.unpack_from('>I', data, offset+8+length)[0]
            if zlib.crc32(data[offset+4:offset+8+length]) & 0xffffffff != crc:
                raise ValueError('PNG CRC mismatch')
            offset = end
            if kind == b'IEND':
                ended = True
                break
        if not ended or offset != len(data):
            raise ValueError('missing IEND or trailing PNG data')
    except (OSError, ValueError, struct.error) as exc:
        errors.append(f'{path}: {exc}')

# The newly redrawn icons and their PBR companions must stay the same size.
progress = load(root.parent / 'texture_progress.json')
for icon in sum((progress.get(group, []) for group in ('redrawn_existing', 'derived_existing', 'derived_extra_existing', 'refined_misc_existing', 'provisional_misc_existing', 'planned_art_only')), []):
    name = 'hakkai_' + icon
    directory = rp / 'textures/items'
    texture_set = load(directory / (name + '.texture_set.json')).get('minecraft:texture_set', {})
    for channel, expected in (('color', name), ('normal', name + '_normal'),
                              ('metalness_emissive_roughness', name + '_mer')):
        if texture_set.get(channel) != expected:
            errors.append(f'{name}: wrong {channel} texture reference')
        path = directory / (expected + '.png')
        try:
            header = path.read_bytes()[:24]
            if header[:8] != b'\x89PNG\r\n\x1a\n' or struct.unpack('>II', header[16:24]) != (128, 128):
                errors.append(f'{path}: expected 128x128 PNG')
        except (OSError, struct.error) as exc:
            errors.append(f'{path}: {exc}')
if errors:
    print('\n'.join(errors))
    raise SystemExit(1)
print('JSON, manifests, identifiers, recipe/loot references, PNGs and item icons OK (static checks only)')
