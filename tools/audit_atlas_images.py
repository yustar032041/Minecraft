#!/usr/bin/env python3
"""Report addon atlas image dimensions; does not simulate Bedrock's atlas.

Pixel totals sum the unique source images, not atlas allocation or GPU memory.
Vanilla entries, atlas padding, packing, mipmaps, streaming and PBR maps are
not counted. Read-only; images are never converted or resized.
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'Hakkai_v7.1.0/ResourcePack'


def texture_paths(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for entry in value:
            yield from texture_paths(entry)
    elif isinstance(value, dict):
        if isinstance(value.get('path'), str):
            yield value['path']
        else:
            raise ValueError(f'unsupported atlas texture object: {value!r}')
    else:
        raise ValueError(f'unsupported atlas texture: {value!r}')


def atlas_report(root, filename, limit=256):
    data = json.loads((root / 'textures' / filename).read_text(encoding='utf8'))['texture_data']
    references = {}
    for key, entry in data.items():
        for path in texture_paths(entry['textures']):
            references.setdefault(path, []).append(key)
    images = []
    for path, keys in references.items():
        # Atlas paths omit the image extension. Fail loudly if unavailable.
        files = [root / (path + ext) for ext in ('.png', '.tga')]
        file = next((p for p in files if p.is_file()), None)
        if file is None:
            raise FileNotFoundError(path)
        with Image.open(file) as im:
            width, height = im.size
        images.append({'path': path, 'keys': keys, 'width': width, 'height': height,
                       'pixels': width * height, 'above_limit': width > limit or height > limit})
    return {'atlas': filename, 'entries': len(data), 'images': images,
            'total_pixels': sum(image['pixels'] for image in images)}


def main():
    for name in ('item_texture.json', 'terrain_texture.json'):
        report = atlas_report(ROOT, name)
        oversized = [image for image in report['images'] if image['above_limit']]
        print(f"{name}: {report['entries']} keys, {len(report['images'])} unique images, "
              f"{report['total_pixels']:,} source pixels, {len(oversized)} images over 256x256")
        for image in oversized:
            print(f"  {image['path']} {image['width']}x{image['height']}")
    print('Source pixels only: not the actual generated atlas, GPU memory, or a rendering test.')


if __name__ == '__main__':
    main()
