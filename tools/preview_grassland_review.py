#!/usr/bin/env python3
"""Render the 17 grassland prototypes for offline visual inspection, not Bedrock.

Individual four-view images are framed independently. Four comparison sheets
use a common framing; transparency is forced opaque so the diagnostic's depth
buffer can be used. Animation, PBR, transparency and Bedrock UV conventions
are not represented. Writes only to an explicit output directory outside packs.
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw
from preview_mob_geometry import RP, collect, render

NAMES = ([f'wild_0_{i}' for i in range(3)]
         + [f'foe_0_{i}' for i in range(12)] + ['guardian_0', 'ender_0'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args()
    output = args.output_dir.resolve()
    pack = RP.resolve().parent
    if output == pack or output.is_relative_to(pack):
        parser.error('output must be outside the pack directories')
    output.mkdir(parents=True, exist_ok=True)
    models = [json.loads((RP / 'models/entity' / f'{n}.geo.json').read_text(encoding='utf8'))['minecraft:geometry'][0] for n in NAMES]
    frame = [p for model in models for quad, _ in collect(model) for p in quad]
    images = []
    for name, model in zip(NAMES, models):
        desc = json.loads((RP / 'entity' / f'{name}.entity.json').read_text(encoding='utf8'))['minecraft:client_entity']['description']
        with Image.open(RP / (desc['textures']['default'] + '.png')) as source:
            texture = source.convert('RGBA')
        texture.putalpha(255)
        render(model, texture, 240, depth_buffer=True).save(output / f'{name}.png')
        images.append((name, render(model, texture, 240, framing=frame, depth_buffer=True)))
    labels = ('front_oblique', 'back_oblique', 'front', 'side')
    for view, label in enumerate(labels):
        sheet = Image.new('RGB', (240*5, 260*4), (24,27,31))
        draw = ImageDraw.Draw(sheet)
        for i, (name, im) in enumerate(images):
            x, y = i%5*240, i//5*260
            sx, sy = view%2*240, view//2*240
            sheet.paste(im.crop((sx,sy,sx+240,sy+240)), (x,y))
            draw.text((x+6,y+241), name, fill=(245,245,245))
        sheet.save(output / f'comparison_{label}.png')
    print(f'{len(NAMES)} four-view previews and 4 same-scale sheets written to {output} (not Bedrock)')


if __name__ == '__main__':
    main()
