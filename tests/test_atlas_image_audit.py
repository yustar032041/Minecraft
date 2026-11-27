"""Read-only atlas size audit, including array variants and path deduplication."""
import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from audit_atlas_images import atlas_report

with TemporaryDirectory() as folder:
    root = Path(folder)
    (root / 'textures').mkdir()
    Image.new('RGBA', (512, 512), (2, 3, 4, 255)).save(root / 'textures/large.png')
    Image.new('RGBA', (32, 64), (2, 3, 4, 255)).save(root / 'textures/small.png')
    atlas = {'texture_data': {'one': {'textures': 'textures/large'},
                              'two': {'textures': [{'path': 'textures/large', 'weight': 1}, 'textures/small']}}}
    (root / 'textures/item_texture.json').write_text(json.dumps(atlas))
    report = atlas_report(root, 'item_texture.json')
    assert report['entries'] == 2 and len(report['images']) == 2
    assert report['total_pixels'] == 512*512 + 32*64
    big = next(image for image in report['images'] if image['width'] == 512)
    assert big['above_limit'] and big['keys'] == ['one', 'two']
    atlas['texture_data']['missing'] = {'textures': 'textures/absent'}
    (root / 'textures/item_texture.json').write_text(json.dumps(atlas))
    try:
        atlas_report(root, 'item_texture.json')
        raise AssertionError('missing image should fail')
    except FileNotFoundError:
        pass

item = atlas_report(ROOT / 'Hakkai_v7.1.0/ResourcePack', 'item_texture.json')
terrain = atlas_report(ROOT / 'Hakkai_v7.1.0/ResourcePack', 'terrain_texture.json')
assert item['entries'] == 398 and terrain['entries'] == 182
assert len([image for image in item['images'] if image['above_limit']]) == 23
assert len([image for image in terrain['images'] if image['above_limit']]) == 5
print('Read-only atlas source audit OK; actual Bedrock atlas and GPU memory not measured')
