#!/usr/bin/env python3
"""Prepare isolated artwork for Bedrock's 128 px item atlas. Requires Pillow.

The source must be a single item on a flat black background. The optional
crystal/shard cut creates a visibly distinct, faceted relative of the source.
"""
import argparse
from collections import deque
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

SIZE = 128
CRYSTALS = [
 [(64,12),(86,28),(99,58),(79,103),(57,116),(28,88),(31,50),(44,26)],
 [(61,9),(82,25),(100,62),(82,103),(59,117),(30,93),(24,61),(39,31)],
 [(62,13),(91,33),(99,64),(82,98),(62,116),(34,99),(27,62),(39,31)],
 [(64,10),(91,35),(97,65),(81,100),(64,117),(47,101),(31,65),(37,35)],
 [(65,12),(91,29),(83,56),(102,63),(70,116),(73,78),(39,93),(49,65),(28,55)],
 [(61,11),(87,30),(99,58),(82,100),(61,116),(34,99),(26,59),(38,31)],
 [(63,12),(86,28),(101,57),(86,87),(64,116),(40,99),(26,63),(39,31)],
 [(63,12),(92,31),(83,61),(93,90),(64,116),(35,91),(45,62),(36,31)],
]
SHARDS = [
 [(45,105),(39,74),(52,24),(71,42),(82,81),(67,108)],
 [(45,105),(38,69),(60,20),(76,49),(83,87),(62,110)],
 [(42,102),(37,68),(61,24),(82,50),(83,91),(66,109)],
 [(46,107),(38,78),(63,17),(82,76),(72,104),(59,112)],
 [(38,102),(53,71),(42,65),(70,19),(65,58),(85,59),(62,108)],
 [(41,104),(37,65),(61,21),(80,45),(84,91),(64,111)],
 [(43,105),(34,74),(61,20),(80,50),(85,89),(65,110)],
 [(39,103),(43,71),(61,24),(80,52),(84,100),(63,110)],
]


def cut_out(source):
    im = Image.open(source).convert('RGB')
    w, h = im.size
    pixels = im.load()
    mask = Image.new('L', (w, h), 255)
    mp = mask.load()
    q = deque()
    def add(x, y):
        if mp[x, y] and max(pixels[x, y]) <= 24:
            mp[x, y] = 0
            q.append((x, y))
    for x in range(w):
        add(x, 0); add(x, h-1)
    for y in range(h):
        add(0, y); add(w-1, y)
    while q:
        x, y = q.popleft()
        if x: add(x-1, y)
        if x+1 < w: add(x+1, y)
        if y: add(x, y-1)
        if y+1 < h: add(x, y+1)
    im.putalpha(mask.filter(ImageFilter.GaussianBlur(.65)))
    # Preserve the original aspect ratio; several weapons are tall or wide.
    im.thumbnail((SIZE, SIZE), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (SIZE, SIZE), (0,0,0,0))
    canvas.alpha_composite(im, ((SIZE-im.width)//2, (SIZE-im.height)//2))
    return canvas


def facet(im, mode, theme):
    shape = (CRYSTALS if mode == 'crystal' else SHARDS)[theme]
    scale = 3
    mask = Image.new('L', (SIZE*scale, SIZE*scale), 0)
    draw = ImageDraw.Draw(mask)
    pts = [(x*scale, y*scale) for x, y in shape]
    draw.polygon(pts, fill=255)
    if mode == 'shard':
        draw.polygon([(90*scale,85*scale),(102*scale,76*scale),(106*scale,94*scale),(96*scale,102*scale)], fill=255)
        draw.polygon([(24*scale,95*scale),(31*scale,89*scale),(35*scale,103*scale),(25*scale,109*scale)], fill=255)
    mask = mask.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    # The original image is a pearl; only sample its colored interior.
    texture = im.crop((24, 24, 104, 104)).resize((SIZE, SIZE), Image.Resampling.LANCZOS).convert('RGB').convert('RGBA')
    texture.putalpha(mask)
    overlay = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    if mode == 'crystal':
        d.polygon([shape[0], shape[1], (61, 61), shape[-1]], fill=(235, 255, 255, 37))
        d.polygon([shape[1], shape[2], shape[3], (61, 61)], fill=(10, 15, 34, 45))
        d.polygon([(61,61),shape[3],shape[4],shape[5]], fill=(10, 15, 34, 52))
        d.line([shape[0],(61,61),shape[4]], fill=(235,255,255,110), width=1)
        d.line([shape[-1],(61,61),shape[2]], fill=(230,255,255,80), width=1)
    else:
        d.polygon([shape[0],shape[1],shape[2],(61,68)], fill=(235,255,255,40))
        d.polygon([shape[2],shape[3],shape[4],(61,68)], fill=(10,15,34,45))
        d.line([shape[2],(61,68),shape[5]], fill=(235,255,255,105), width=1)
    # Clip all facet shading to the item shape, preserving transparency.
    overlay.putalpha(Image.composite(overlay.getchannel('A'), Image.new('L',(SIZE,SIZE)), mask))
    return Image.alpha_composite(texture, overlay)


def save_with_maps(image, path):
    path = Path(path)
    if path.suffix != '.png':
        raise ValueError('output must be .png')
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)
    name = path.stem
    alpha = image.getchannel('A').load()
    lum = image.convert('RGB').convert('L').filter(ImageFilter.GaussianBlur(1)).load()
    normal = Image.new('RGBA', image.size)
    mer = Image.new('RGBA', image.size)
    np, mp, colors = normal.load(), mer.load(), image.load()
    for y in range(SIZE):
        for x in range(SIZE):
            dx = (lum[min(127,x+1),y]-lum[max(0,x-1),y])/255*1.1
            dy = (lum[x,min(127,y+1)]-lum[x,max(0,y-1)])/255*1.1
            inv = 1/math.sqrt(dx*dx+dy*dy+1)
            np[x,y] = (round(127.5*(1-dx*inv)), round(127.5*(1-dy*inv)), round(127.5*(1+inv)), alpha[x,y])
            r,g,b,_ = colors[x,y]
            metallic = 45 if r>g*1.1 and g>b*1.2 else 0
            emissive = max(0,min(100,round((max(r,g,b)-min(r,g,b))*.4)))
            mp[x,y] = (metallic, emissive, 160, alpha[x,y])
    normal.save(path.with_name(name+'_normal.png'))
    mer.save(path.with_name(name+'_mer.png'))
    texture_set = {'format_version':'1.16.100', 'minecraft:texture_set':{
        'color':name, 'normal':name+'_normal', 'metalness_emissive_roughness':name+'_mer'}}
    path.with_name(name+'.texture_set.json').write_text(json.dumps(texture_set,indent=2)+'\n',encoding='utf8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source')
    parser.add_argument('output')
    parser.add_argument('--mode', choices=('original','crystal','shard'), default='original')
    parser.add_argument('--theme', type=int, choices=range(8), default=0)
    args = parser.parse_args()
    image = cut_out(args.source)
    if args.mode != 'original':
        image = facet(image,args.mode,args.theme)
    save_with_maps(image,args.output)
