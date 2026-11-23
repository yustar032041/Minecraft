"""Check catalog-derived equipment art is reproducible. Requires Pillow."""
import json
from pathlib import Path
import sys
from PIL import Image

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'tools'))
from render_gear_icons import KINDS, TEMPLATES, ITEMS, catalog, make_icon

progress = json.loads((root / 'texture_progress.json').read_text(encoding='utf-8'))
expected = {item['id'] for item in catalog() if item['kind'] in KINDS}
assert set(progress['derived_existing']) == expected
for gear in catalog():
    if gear['id'] not in expected:
        continue
    base = Image.open(TEMPLATES / (KINDS[gear['kind']] + '.png')).convert('RGBA')
    result = make_icon(base, gear['a'], gear['modifier'], gear['rank'])
    actual = Image.open(ITEMS / ('hakkai_' + gear['id'] + '.png')).convert('RGBA')
    # RGBA getbbox on a difference image can ignore RGB-only changes because
    # its alpha difference is zero; compare raw pixel bytes instead.
    assert result.tobytes() == actual.tobytes(), gear['id']
print(f'{len(expected)} gear icons match their catalog data and reusable templates')
