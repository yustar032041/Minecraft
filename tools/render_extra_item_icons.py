#!/usr/bin/env python3
"""Prepare additional icon variants from reusable paintings. Requires Pillow.

The old numbered monster-core helpers are retained for reference only. Creature
materials now use separate attribute art from render_mob_drop_elements.py.
"""
import json
import re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
from import_item_art import save_with_maps
from render_gear_icons import ROOT, PACK, ITEMS, TEMPLATES, COLORS, color_from_hex, mix, draw_attribute, make_icon

REALM_ATTRS = [0,10,12,11,4,6,15,7]
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

def recolor(base, attr, strength=.7):
    c=color_from_hex(COLORS[attr]); gray=ImageOps.grayscale(base)
    tint=ImageOps.colorize(gray,black=mix(c,(5,8,15),.85),white=mix(c,(255,255,255),.43)).convert('RGBA')
    tint.putalpha(base.getchannel('A'))
    return Image.blend(base,tint,strength)

def numbered(im, realm, number, prefix=''):
    im=im.copy()
    # Realm symbol and large index: the index is deliberately not represented
    # as a claim of bespoke creature-specific art.
    im.alpha_composite(draw_attribute(REALM_ATTRS[realm],21),(2,3))
    d=ImageDraw.Draw(im)
    font=ImageFont.truetype(FONT,22)
    label=prefix+str(number)
    bbox=d.textbbox((0,0),label,font=font,stroke_width=1)
    x=124-(bbox[2]-bbox[0]);y=99
    d.text((x,y),label,font=font,fill=(250,239,205,255),stroke_width=2,stroke_fill=(22,22,28,255))
    return im

def wildlife_models():
    source=(PACK/'BehaviorPack/scripts/data.js').read_text(encoding='utf8')
    line=next(line for line in source.splitlines() if line.startswith('export const wildlife='))
    entries=json.loads(line[len('export const wildlife='):].removesuffix(';'))
    return {entry['id']:entry['model'] for entry in entries}


def creature_mark(model):
    # Seven silhouette families. Render at 4x so the mark remains crisp at
    # inventory scale; it complements rather than replaces the creature index.
    size=36; k=4; im=Image.new('RGBA',(size*k,size*k)); d=ImageDraw.Draw(im)
    def points(p):return [(int(x*k),int(y*k)) for x,y in p]
    def poly(p):d.polygon(points(p),fill=(244,224,179,255))
    def line(p,w=2):d.line(points(p),fill=(244,224,179,255),width=w*k,joint='curve')
    def oval(box,fill=(244,224,179,255)):
        d.ellipse(tuple(int(x*k) for x in box),fill=fill)
    d.ellipse((1*k,1*k,35*k,35*k),fill=(24,29,38,228),outline=(224,187,111,245),width=k)
    if model=='deer':
        poly([(13,17),(23,17),(25,25),(18,30),(11,25)])
        line([(14,18),(9,12),(8,6)]);line([(10,12),(5,9)]);line([(22,18),(27,12),(28,6)]);line([(26,12),(31,9)])
    elif model=='fox':
        poly([(8,9),(16,15),(18,14),(20,15),(28,9),(27,23),(18,29),(9,23)])
        poly([(14,21),(22,21),(18,26)])
    elif model=='hare':
        oval((11,15,25,29));oval((10,5,15,20));oval((21,5,26,20))
    elif model=='bird':
        poly([(7,21),(12,12),(20,9),(27,12),(30,17),(24,18),(20,26),(12,26)])
        poly([(26,13),(32,15),(27,17)])
    elif model=='bug':
        oval((10,9,26,27));line([(18,10),(18,26)]);line([(13,11),(9,6)]);line([(23,11),(27,6)])
    elif model=='spider':
        oval((11,14,25,25));oval((15,10,21,16))
        for y in (15,19,23):
            line([(12,y),(8,y-2),(6,y-4)],1);line([(24,y),(28,y-2),(30,y-4)],1)
    elif model=='brute':
        poly([(8,12),(13,8),(16,12),(19,8),(22,12),(26,10),(28,16),(25,26),(12,28),(8,23)])
        line([(12,16),(12,20)],1);line([(17,14),(17,19)],1);line([(22,15),(22,19)],1)
    else: raise ValueError(f'unknown wildlife model: {model}')
    return im.resize((size,size),Image.Resampling.LANCZOS)


def core_icon(core,realm,index,category,model):
    im=recolor(core,REALM_ATTRS[realm],.72)
    im=numbered(im,realm,index+1,'W' if category=='wild' else '')
    im.alpha_composite(creature_mark(model),(3,88))
    return im


def main():
    progress_path=ROOT/'texture_progress.json';progress=json.loads(progress_path.read_text(encoding='utf-8'))
    protected=set(progress['redrawn_existing']+progress['derived_existing'])
    images={name:Image.open(TEMPLATES/(name+'.png')).convert('RGBA') for name in ['chest','core','stew','bottle','seed','book']}
    originals={k:Image.open(ITEMS/('hakkai_'+k+'_0.png')).convert('RGBA') for k in ('crystal','shard')}
    made={}
    # Ascended equipment shares a base silhouette, with the theme of its realm.
    for number in range(187,214):
        realm=(number-188)%8 if number<212 and number>=188 else (7 if number!=187 else 6)
        rank=1 if number<196 else 2 if number<204 else 3
        icon=make_icon(images['chest'],REALM_ATTRS[realm],REALM_ATTRS[(realm+1)%8],rank)
        made[f'gear_{number:03d}']=numbered(icon,realm,number-186)
    # Base artwork for wind crystal/shard is reused and recolored for other attributes.
    for kind in ('crystal','shard'):
        for a in range(20):
            name=f'{kind}_{a}'
            if name in protected: continue
            im=recolor(originals[kind],a,.84)
            im.alpha_composite(draw_attribute(a,23),(3,3))
            made[name]=im
    # Creature materials have been consolidated by attribute. Their bespoke
    # art is maintained by render_mob_drop_elements.py, not this legacy renderer.
    bowls={
      'autumn_squash_potage':12,'camp_stew':3,'forest_trail_meal':13,
      'frost_blossom_tea':11,'spring_garden_soup':0,'summer_corn_stew':5,
      'sunflower_trail_bowl':5,
    }
    for name,attr in bowls.items():
        im=recolor(images['stew'],attr,.28);im.alpha_composite(draw_attribute(attr,22),(2,2))
        if name=='sunflower_trail_bowl':im.alpha_composite(draw_attribute(0,17),(106,105))
        made[name]=im
    for name,attr in {'mana_draught':7,'mana_tonic':8,'spring_water_flask':1}.items():
        im=recolor(images['bottle'],attr,.6);im.alpha_composite(draw_attribute(attr,22),(2,2));made[name]=im
    for name,attr in {'autumn_squash_seed':12,'ice_blossom_seed':11,'spring_tulip_seed':0,'summer_corn_seed':5,'summer_sunflower_seed':5}.items():
        im=recolor(images['seed'],attr,.25);im.alpha_composite(draw_attribute(attr,22),(2,2))
        # Both summer seeds share an attribute; small distinct marker.
        if name=='summer_sunflower_seed':im.alpha_composite(draw_attribute(13,15),(108,105))
        made[name]=im
    for name,attr in {'awaken_book':8,'rune_book_0':0,'rune_book_1':1,'rune_book_2':4,'rune_book_3':7}.items():
        im=make_icon(images['book'],attr,attr,1);made[name]=im
    assert not set(made)&protected
    for name,im in made.items():
        assert (PACK/'BehaviorPack/items'/(name+'.json')).exists(),name
        save_with_maps(im,ITEMS/('hakkai_'+name+'.png'))
    progress['derived_extra_existing']=sorted(set(progress['derived_extra_existing']) | set(made))
    progress_path.write_text(json.dumps(progress,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(f'Rendered {len(made)} additional provisional icons')

if __name__=='__main__': main()
