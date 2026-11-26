#!/usr/bin/env python3
"""Render all wearable set combinations for *offline* review, not Bedrock.

Four-view miniature mannequins use the same approximate geometry renderer as
build_icon_matched_armor.py. They cannot verify animation, UV orientation,
lighting, client-side clipping or material support.
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw
from build_icon_matched_armor import ROOT, EQ, wearable_items, assembled_turnaround

OUT = ROOT / 'art_sources/armor_wear_previews/all_sets'
PARTS = ('helmet', 'chest', 'leggings', 'boots')


def sets():
    result=[]
    for i in range(11):
        result.append({'label':f'series {i:02d}', 'items':[
            f'gear_{11+16*i:03d}',f'gear_{10+16*i:03d}',
            f'series_leggings_{i:02d}',f'gear_{12+16*i:03d}']})
    for realm in range(8):
        for stage,base in [('awaken',188),('ascended',196),('legacy',204)]:
            result.append({'label':f'guardian {realm} / {stage}', 'items':[
                f'guardian_armor_{realm}_helmet',f'gear_{base+realm}',
                f'guardian_armor_{realm}_leggings',f'guardian_armor_{realm}_boots']})
    for family, chests in [('nightwalker',(186,187)),('united',(212,213))]:
        for chest in chests:
            result.append({'label':f'{family} / gear_{chest}', 'items':[
                f'{family}_armor_helmet',f'gear_{chest}',
                f'{family}_armor_leggings',f'{family}_armor_boots']})
    result.append({'label':'ultimate', 'items':['ult_helmet','ult_chest','ult_leggings','ult_boots']})
    return result


def render_sheets():
    items={name:(part,icon) for name,part,icon in wearable_items()}
    rows=sets()
    assert len(rows)==40 and {item for row in rows for item in row['items']}==set(items)
    for sheet in range(5):
        # Each cell presents the four source item icons and four approximate
        # mannequin views. Source textures and armor items are never modified.
        image=Image.new('RGB',(1600,848),(24,28,34));draw=ImageDraw.Draw(image)
        for cell,row in enumerate(rows[sheet*8:sheet*8+8]):
            x=(cell%4)*400;y=(cell//4)*424
            draw.text((x+8,y+8),row['label'],fill=(235,239,245))
            worn={}
            for i,(name,part) in enumerate(zip(row['items'],PARTS)):
                assert items[name][0]==part,(name,part)
                icon=Image.open(items[name][1]).convert('RGBA').resize((32,32),Image.Resampling.LANCZOS)
                image.paste(icon,(x+240+i*36,y+2),icon)
                worn[part]=Image.open(EQ/(name+'.png')).convert('RGBA')
            view=assembled_turnaround(worn).resize((384,384),Image.Resampling.LANCZOS)
            image.paste(view,(x+8,y+34))
        yield sheet,image


def main():
    p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');args=p.parse_args()
    if args.write==args.check:p.error('choose --write or --check')
    index=json.dumps(sets(),ensure_ascii=False,indent=2)+'\n'
    if args.write:OUT.mkdir(parents=True,exist_ok=True);(OUT/'index.json').write_text(index,encoding='utf8')
    elif (OUT/'index.json').read_text(encoding='utf8')!=index:raise SystemExit('armor preview index out of date')
    for sheet,image in render_sheets():
        path=OUT/f'armor_sets_{sheet+1:02d}.png'
        if args.write:image.save(path)
        elif not path.exists() or Image.open(path).convert('RGB').tobytes()!=image.tobytes():raise SystemExit(f'armor preview out of date: {path}')
        print(('wrote ' if args.write else 'checked ')+str(path.relative_to(ROOT)))

if __name__=='__main__':main()
