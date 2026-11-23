#!/usr/bin/env python3
"""Report actual item icon coverage without equating image existence to quality."""
import collections
import json
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
bp = root / 'Hakkai_v7.1.0/BehaviorPack/items'
rp = root / 'Hakkai_v7.1.0/ResourcePack'
progress = json.loads((root / 'texture_progress.json').read_text(encoding='utf-8'))
atlas = json.loads((rp / 'textures/item_texture.json').read_text(encoding='utf-8'))['texture_data']
items = {}
for path in bp.glob('*.json'):
    entry = json.loads(path.read_text(encoding='utf-8-sig'))['minecraft:item']
    icon = entry['components'].get('minecraft:icon')
    if isinstance(icon, dict):
        icon = icon.get('textures', {}).get('default')
    items[path.stem] = icon
redrawn = progress['redrawn_existing']
derived = progress.get('derived_existing', []) + progress.get('derived_extra_existing', []) + progress.get('refined_misc_existing', [])
provisional = progress.get('provisional_misc_existing', [])
planned = progress['planned_art_only']
assert all(len(set(group)) == len(group) for group in (redrawn, derived, provisional, planned))
assert len(set(redrawn + derived + provisional + planned)) == sum(map(len, (redrawn, derived, provisional, planned)))
for name in redrawn + derived + provisional:
    assert name in items, f'no existing item for {name}'
    assert items[name] == 'hakkai_' + name, f'unexpected icon for {name}'
for name in planned:
    assert name not in items, f'{name} is now an item; update texture_progress.json'
for name in redrawn + derived + provisional + planned:
    key = 'hakkai_' + name
    assert atlas.get(key, {}).get('textures') == 'textures/items/' + key, f'atlas mismatch: {key}'
    directory = rp / 'textures/items'
    texture_set = json.loads((directory / (key + '.texture_set.json')).read_text(encoding='utf-8'))['minecraft:texture_set']
    assert texture_set == {'color':key,'normal':key+'_normal','metalness_emissive_roughness':key+'_mer'}
    for suffix in ('', '_normal', '_mer'):
        assert (directory / (key+suffix+'.png')).is_file()
remaining = set(items) - set(redrawn) - set(derived) - set(provisional)
groups = collections.Counter(re.sub(r'_\d+$', '', name) for name in remaining)
print(f'Existing items: {len(items)}; individually redrawn: {len(redrawn)}; template-derived: {len(derived)}; provisional vector: {len(provisional)}; not yet redrawn: {len(remaining)}')
print(f'Planned art only: {len(planned)} (not functional items)')
print('Largest remaining groups: ' + ', '.join(f'{name}={count}' for name,count in groups.most_common(12)))
