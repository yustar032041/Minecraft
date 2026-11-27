"""Check PNG structure and full pixel decoding, not Bedrock rendering or transfer."""
from pathlib import Path
from PIL import Image

rp = Path(__file__).resolve().parents[1] / 'Hakkai_v7.1.0' / 'ResourcePack'
images = sorted(rp.rglob('*.png'))
assert images, 'No PNG images found'
errors = []
for path in images:
    try:
        # verify() checks container structure and CRCs but does not decode pixels.
        with Image.open(path) as image:
            assert image.format == 'PNG', 'File is not a PNG'
            image.verify()
        # Reopen after verify() and force the entire compressed image to decode.
        with Image.open(path) as image:
            image.load()
    except Exception as error:
        errors.append(f'{path.relative_to(rp)}: {error}')
assert not errors, 'Invalid resource PNGs:\n' + '\n'.join(errors)
print(f'{len(images)} resource PNGs pass container verification and full decoding; in-game rendering unverified')
