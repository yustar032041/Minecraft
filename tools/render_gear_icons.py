#!/usr/bin/env python3
"""Render catalog gear from reusable base paintings and attribute-specific marks.

Requires Pillow. Keeps actual game identifiers and data.js untouched. The base
paintings and the composite outputs are tracked so a future edit is reproducible.
"""
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps
from import_item_art import save_with_maps

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'Hakkai_v7.1.0'
ITEMS = PACK / 'ResourcePack/textures/items'
TEMPLATES = ROOT / 'tools/art_templates'
KINDS = {'剣':'sword','斧':'axe','弓':'bow','杖':'staff','ハンマー':'hammer',
         '槍':'spear','盾':'shield','扇':'fan','指輪':'ring','首飾り':'necklace',
         '鎧':'chest','兜':'helmet','靴':'boots','マント':'cloak','本':'book','石':'stone'}
# 20 different attributes in the same order as data.js attrs.
COLORS = ['#acd65e','#4ba6e5','#ee6344','#c7975d','#b679ee','#f9d879','#7055a2',
          '#bba56c','#819bf2','#ec9bd7','#77a79d','#b7e4f4','#e8aa55','#619761',
          '#357fbe','#86d6eb','#c294de','#e69ab4','#ba8f68','#52b4ae']


def mix(a,b,t):
    return tuple(round(a[i]*(1-t)+b[i]*t) for i in range(3))


def color_from_hex(h):
    return tuple(int(h[i:i+2],16) for i in (1,3,5))


def draw_attribute(index, size):
    """Each attribute has its own line motif as well as a color."""
    S=4
    im=Image.new('RGBA',(size*S,size*S),(0,0,0,0));d=ImageDraw.Draw(im)
    c=color_from_hex(COLORS[index]); color=(*mix(c,(255,255,255),.35),255)
    dark=(*mix(c,(20,20,26),.55),230)
    def xy(x,y):return (round(x*size*S/20),round(y*size*S/20))
    def line(points,width=1.6,fill=color):
        d.line([xy(*p) for p in points],fill=fill,width=max(1,round(width*size*S/20)),joint='curve')
    def ellipse(a,fill=None,outline=color,width=1.4):
        d.ellipse([xy(a[0],a[1]),xy(a[2],a[3])],fill=fill,outline=outline,width=max(1,round(width*size*S/20)))
    def arc(a,start,end,width=1.5,fill=color):
        d.arc([xy(a[0],a[1]),xy(a[2],a[3])],start,end,fill=fill,width=max(1,round(width*size*S/20)))
    def poly(points,fill=color):d.polygon([xy(*p) for p in points],fill=fill)
    if index==0: # wind
        arc((1,3,18,13),180,360,1.9);arc((7,4,17,13),260,520,1.7);line([(2,14),(14,14),(17,12)])
    elif index==1: # water droplet
        poly([(10,1),(16,9),(16,13),(14,17),(10,19),(6,17),(4,13),(4,9)],dark);line([(10,2),(4,10),(4,13),(6,17),(10,19),(14,17),(16,13),(16,10),(10,2)])
    elif index==2: # flame
        poly([(10,1),(12,7),(16,6),(17,13),(14,18),(8,19),(4,16),(4,11),(7,7),(8,11)],color);poly([(10,9),(13,13),(12,17),(9,17),(8,14)],dark)
    elif index==3: # earth block
        poly([(3,5),(11,2),(17,6),(17,15),(9,19),(3,15)],dark);line([(3,5),(11,2),(17,6),(17,15),(9,19),(3,15),(3,5),(9,9),(17,6)]);line([(9,9),(9,19)])
    elif index==4: poly([(12,1),(4,11),(9,11),(7,19),(17,8),(12,8),(15,1)])
    elif index==5: # sun
        ellipse((6,6,14,14),fill=dark)
        for i in range(8):
            a=i*math.pi/4;line([(10+6*math.cos(a),10+6*math.sin(a)),(10+9*math.cos(a),10+9*math.sin(a))])
    elif index==6: # moon shadow
        arc((3,2,18,18),65,300,2.8);arc((0,1,14,16),290,75,1.4)
    elif index==7: # hourglass
        line([(5,2),(15,2),(5,18),(15,18),(5,2)]);line([(15,2),(5,18)])
    elif index==8: # star
        pts=[]
        for i in range(10):
            a=-math.pi/2+i*math.pi/5;r=9 if i%2==0 else 4;pts.append((10+r*math.cos(a),10+r*math.sin(a)))
        poly(pts)
    elif index==9: # rainbow
        for v,r in enumerate((9,6,3)):arc((10-r,13-r,10+r,13+r),180,360,1.5,(*mix(c,((255,190,90),(110,220,255),(210,150,255))[v],.55),255))
    elif index==10: # mist
        for y in (5,9,13,17):line([(2,y),(16 if y%2 else 13,y)],1.7)
    elif index==11: # snowflake
        for a in (0,math.pi/3,2*math.pi/3):
            dx,dy=8*math.cos(a),8*math.sin(a);line([(10-dx,10-dy),(10+dx,10+dy)])
        ellipse((8,8,12,12),fill=color)
    elif index==12: # sand dunes
        line([(1,13),(5,10),(9,12),(13,8),(19,12)],2);line([(2,17),(8,14),(12,16),(18,13)],1.4)
    elif index==13: # forest tree
        poly([(10,1),(3,11),(7,11),(3,15),(17,15),(13,11),(17,11)],color);line([(10,13),(10,19)],2)
    elif index==14: # sea wave
        arc((2,3,16,17),210,540,2);line([(1,16),(5,14),(10,16),(15,14),(19,16)])
    elif index==15: # wing
        poly([(3,13),(17,2),(15,9),(18,9),(12,15),(7,17)],dark);line([(3,13),(17,2),(15,9),(18,9),(12,15),(7,17),(3,13)]);line([(7,14),(14,9)])
    elif index==16: # dream cloud and star
        arc((2,8,10,16),150,300,1.7);arc((6,4,15,14),170,350,1.7);line([(3,15),(16,15)]);line([(16,2),(16,6)]);line([(14,4),(18,4)])
    elif index==17: # music note
        line([(8,14),(8,3),(16,2),(16,11)],2);ellipse((3,13,8,17),fill=color,outline=None);ellipse((11,10,16,14),fill=color,outline=None)
    elif index==18: # anchor
        line([(10,3),(10,18)],2);ellipse((8,1,12,5));line([(5,7),(15,7)]);arc((3,8,17,18),0,180,2)
    else: # lake
        ellipse((2,5,18,15),outline=color);line([(5,10),(9,9),(13,10),(16,9)])
    return im.resize((size,size),Image.Resampling.LANCZOS)


def make_icon(base,attr,modifier,rank):
    alpha=base.getchannel('A')
    c=color_from_hex(COLORS[attr]); gray=ImageOps.grayscale(base)
    tinted=ImageOps.colorize(gray,black=mix(c,(5,8,15),.86),white=mix(c,(255,255,255),.46)).convert('RGBA')
    tinted.putalpha(alpha)
    output=Image.blend(base,tinted,.62)
    # Main attribute at top-left; secondary at bottom-right. The rank dots
    # distinguish identical named gear across advancement tiers.
    output.alpha_composite(draw_attribute(attr,19),(3,4))
    output.alpha_composite(draw_attribute(modifier,15),(108,105))
    mark=ImageDraw.Draw(output)
    for i in range(max(1,min(3,rank))):
        x=5+i*5;mark.ellipse((x,120,x+2,122),fill=(232,195,105,245))
    return output


def catalog():
    for line in (PACK/'BehaviorPack/scripts/data.js').read_text(encoding='utf-8').splitlines():
        if line.startswith('export const catalog='):
            return json.loads(line[len('export const catalog='):].removesuffix(';'))
    raise ValueError('catalog not found')


def main():
    bases={kind:Image.open(TEMPLATES/(file+'.png')).convert('RGBA') for kind,file in KINDS.items()}
    progress_path=ROOT/'texture_progress.json'
    progress=json.loads(progress_path.read_text(encoding='utf-8'))
    rendered=[]
    for gear in catalog():
        if gear['kind'] not in bases: continue
        name=gear['id']; attr=gear['a'];modifier=gear['modifier'];rank=gear['rank']
        if not (0<=attr<len(COLORS) and 0<=modifier<len(COLORS)):
            raise ValueError(f'unknown attribute for {name}')
        image=make_icon(bases[gear['kind']],attr,modifier,rank)
        save_with_maps(image, ITEMS/('hakkai_'+name+'.png'))
        rendered.append(name)
    progress['derived_existing']=rendered
    progress_path.write_text(json.dumps(progress,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Rendered {len(rendered)} catalog icons from {len(bases)} type templates; review appearance in Bedrock.')

if __name__=='__main__': main()
