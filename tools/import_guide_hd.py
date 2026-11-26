#!/usr/bin/env python3
"""Key a hand-picked single guide-book source into a 1024px Bedrock icon.

Requires Pillow. PBR maps are neutral placeholders, not reconstructed surface
normals. This is one icon, not a blanket upscaling of all pack textures.
"""
from pathlib import Path
from PIL import Image, ImageChops
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'art_sources/guide_book_hd.png'
OUT=ROOT/'Hakkai_v7.1.0/ResourcePack/textures/items/hakkai_guide.png'
im=Image.open(SRC).convert('RGB')
r,g,b=im.split()
# Distance from pure magenta. A small feather preserves antialiased edges.
distance=ImageChops.lighter(ImageChops.lighter(ImageChops.invert(r),g),ImageChops.invert(b))
alpha=distance.point(lambda v: max(0,min(255,round((v-55)*255/90))))
im.putalpha(alpha)
im=im.resize((1024,1024),Image.Resampling.LANCZOS)
im.save(OUT,optimize=True)
for suffix,color in [('_normal',(128,128,255,0)),('_mer',(0,0,180,0))]:
 layer=Image.new('RGBA',im.size,color);layer.putalpha(im.getchannel('A'));layer.save(OUT.with_name(OUT.stem+suffix+'.png'),optimize=True)
print('Guide artwork: new isolated 1024px image and neutral 1024px PBR companions')
