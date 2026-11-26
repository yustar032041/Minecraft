#!/usr/bin/env python3
"""Render independently authored attribute materials at 512px; requires Pillow.

Sources on black are individually generated illustrations, not color variants.
Normal and MER are deliberately neutral placeholders, not authored PBR.
Only attributes with a source are touched; unfinished attributes stay unchanged.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw
import import_item_art

ROOT=Path(__file__).resolve().parents[1]
SOURCES=ROOT/'art_sources/mob_drop_elements'
ITEMS=ROOT/'Hakkai_v7.1.0/ResourcePack/textures/items'
SIZE=512

def render(source):
    import_item_art.SIZE=SIZE
    return import_item_art.cut_out(source)

def inventory_preview():
    """Approximate 32px slots; labels are only for audit, not game icons."""
    out=Image.new('RGB',(800,180),(75,75,75));draw=ImageDraw.Draw(out)
    for attr in range(20):
        x=(attr%10)*80;y=(attr//10)*90
        im=Image.open(ITEMS/f'hakkai_drop_element_{attr}.png').convert('RGBA')
        im.thumbnail((32,32),Image.Resampling.LANCZOS)
        out.paste(im,(x+24,y+12),im);draw.text((x+29,y+52),str(attr),fill='white')
    return out

def main():
    for source in sorted(SOURCES.glob('*.png'),key=lambda p:int(p.stem)):
        attr=int(source.stem)
        if not 0<=attr<20:raise ValueError(source)
        name=f'hakkai_drop_element_{attr}';im=render(source)
        im.save(ITEMS/f'{name}.png')
        for suffix,color in [('_normal',(128,128,255,255)),('_mer',(0,0,180,255))]:
            m=Image.new('RGBA',im.size,color);m.putalpha(im.getchannel('A'));m.save(ITEMS/f'{name}{suffix}.png')
        data={'format_version':'1.16.100','minecraft:texture_set':{'color':name,'normal':name+'_normal','metalness_emissive_roughness':name+'_mer'}}
        (ITEMS/f'{name}.texture_set.json').write_text(json.dumps(data,indent=2)+'\n',encoding='utf8')
        print(name,source.name)
    preview=ROOT/'art_sources/mob_drop_previews/inventory_32px.png'
    preview.parent.mkdir(parents=True,exist_ok=True)
    inventory_preview().save(preview)
if __name__=='__main__':main()
