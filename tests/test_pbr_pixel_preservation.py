"""Verify the 16px source artwork survived PBR size alignment exactly."""
import hashlib
import json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
hashes=json.loads((root/'tests/fixtures/pbr_block_original_pixels.json').read_text())
assert len(hashes)==17
for name,expected in hashes.items():
    with Image.open(root/f'Hakkai_v7.1.0/ResourcePack/textures/blocks/hakkai_{name}.png') as src:
        image=src.convert('RGBA');assert image.size==(32,32),name
        half=image.resize((16,16),Image.Resampling.NEAREST)
        assert hashlib.sha256(half.tobytes()).hexdigest()==expected,name
        assert half.resize((32,32),Image.Resampling.NEAREST).tobytes()==image.tobytes(),name
print('17 block images retain exact original RGBA pixels after nearest-neighbor 2x expansion')
