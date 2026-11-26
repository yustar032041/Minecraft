#!/usr/bin/env python3
"""Build selected guide/return icon artwork from isolated black-background sources.

The maps are neutral placeholders, not inferred geometry. --check compares pixels,
so differences in PNG encoder settings do not affect reproducibility.
"""
import argparse
from collections import deque
import json
from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
RP = ROOT / 'Hakkai_v7.1.0/ResourcePack/textures'
SOURCES = ROOT / 'art_sources/guide_ui'
ITEMS = {'industrial_guide': 1024, 'return_stone': 1024}
UI = {'bed': 256, 'home': 256, 'world': 256, 'map': 256}

def cut(source, size):
    im = Image.open(source).convert('RGB')
    w, h = im.size
    p = im.load()
    mask = Image.new('L', (w, h), 255)
    m = mask.load()
    queue = deque()
    def add(x, y):
        if m[x, y] and max(p[x, y]) <= 20:
            m[x, y] = 0
            queue.append((x, y))
    for x in range(w):
        add(x, 0); add(x, h-1)
    for y in range(h):
        add(0, y); add(w-1, y)
    while queue:
        x, y = queue.popleft()
        if x: add(x-1, y)
        if x+1 < w: add(x+1, y)
        if y: add(x, y-1)
        if y+1 < h: add(x, y+1)
    im.putalpha(mask.filter(ImageFilter.GaussianBlur(.6)))
    return im.resize((size, size), Image.Resampling.LANCZOS)

def outputs():
    for name, size in ITEMS.items():
        im = cut(SOURCES / f'{name}_source.png', size)
        path = RP / 'items' / f'hakkai_{name}.png'
        yield path, im
        for suffix, color in (('_normal', (128, 128, 255, 0)), ('_mer', (0, 0, 180, 0))):
            layer = Image.new('RGBA', im.size, color)
            layer.putalpha(im.getchannel('A'))
            yield path.with_name(path.stem + suffix + '.png'), layer
    for name, size in UI.items():
        yield RP / 'ui' / f'hakkai_return_{name}.png', cut(SOURCES / f'{name}_source.png', size)

def main():
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write', action='store_true')
    mode.add_argument('--check', action='store_true')
    args = parser.parse_args()
    errors = []
    for path, image in outputs():
        if args.write:
            path.parent.mkdir(parents=True, exist_ok=True)
            image.save(path, optimize=True)
        elif not path.exists() or Image.open(path).convert('RGBA').tobytes() != image.tobytes():
            errors.append(str(path))
    for name in ITEMS:
        stem = f'hakkai_{name}'
        path = RP / 'items' / (stem + '.texture_set.json')
        value = {'format_version':'1.16.100', 'minecraft:texture_set':{'color':stem, 'normal':stem+'_normal', 'metalness_emissive_roughness':stem+'_mer'}}
        if args.write:
            path.write_text(json.dumps(value, indent=2)+'\n', encoding='utf8')
        elif not path.exists() or json.loads(path.read_text(encoding='utf8')) != value:
            errors.append(str(path))
    if errors:
        raise SystemExit('Out of date: ' + ', '.join(errors))
    print('Guide and return artwork ' + ('written' if args.write else 'matches sources'))

if __name__ == '__main__':
    main()
