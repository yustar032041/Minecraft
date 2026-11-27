#!/usr/bin/env python3
"""Render the 139 realm and patrol MOBs (excluding the eight-realm king and protected characters) in groups for offline review.

Four static views per individual, independently framed. Transparency is forced
opaque for the depth buffer; rotations, UV direction, animation, PBR, occlusion
and engine rendering are only approximated. Nothing under either pack is
written. Final boss, three protected characters and future special abilities
are deliberately outside this batch.
"""
import argparse
import concurrent.futures
import json
from pathlib import Path
from PIL import Image, ImageDraw
from preview_mob_geometry import RP, render


def realm_names(r):
    if r==8:return ['village_archer','village_mage','village_watch']
    return ([f'wild_{r}_{i}' for i in range(3)] +
            [f'foe_{r}_{i}' for i in range(12)] + [f'guardian_{r}',f'ender_{r}'])


def render_realm(args):
    r,output,panel=args
    names=realm_names(r)
    sheet=Image.new('RGB',(panel*2*5,(panel*2+21)*4),(24,27,31))
    draw=ImageDraw.Draw(sheet)
    for i,name in enumerate(names):
        model=json.loads((RP/'models/entity'/f'{name}.geo.json').read_text(encoding='utf8'))['minecraft:geometry'][0]
        desc=json.loads((RP/'entity'/f'{name}.entity.json').read_text(encoding='utf8'))['minecraft:client_entity']['description']
        with Image.open(RP/(desc['textures']['default']+'.png')) as source:
            texture=source.convert('RGBA')
        texture.putalpha(255)
        im=render(model,texture,panel,depth_buffer=True)
        im.save(output/f'{name}.png')
        x=(i%5)*panel*2;y=(i//5)*(panel*2+21)
        sheet.paste(im,(x,y));draw.text((x+6,y+panel*2+3),name,fill=(245,245,245))
    sheet.save(output/f'realm_{r}.png')
    return len(names)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir',required=True,type=Path)
    parser.add_argument('--panel',type=int,default=120)
    parser.add_argument('--workers',type=int,default=4)
    parser.add_argument('--realm',type=int,choices=range(9),help='0–7 realms; 8 village patrol; omit for all')
    args=parser.parse_args();output=args.output_dir.resolve()
    if output==RP.resolve().parent or output.is_relative_to(RP.resolve().parent):
        parser.error('output must be outside pack directories')
    if not 80<=args.panel<=300 or not 1<=args.workers<=8:
        parser.error('panel must be 80–300 and workers must be 1–8')
    output.mkdir(parents=True,exist_ok=True)
    jobs=[(r,output,args.panel) for r in ([args.realm] if args.realm is not None else range(9))]
    with concurrent.futures.ProcessPoolExecutor(max_workers=args.workers) as pool:
        count=sum(pool.map(render_realm,jobs))
    print(f'{count} MOBs in four approximate rest-pose views: {output} (not Bedrock)')


if __name__=='__main__':main()
