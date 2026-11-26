#!/usr/bin/env python3
"""Reproducible experimental crop geometry and texture atlases.

Uses AI-generated reference art under art_sources/seasonal_garden. This is a
prototype, not a Bedrock renderer or a guarantee of high-quality final art.
Only the five crop block textures and their dedicated geometry are touched;
the original resources are preserved in tools/art_templates/seasonal_garden/legacy.
"""
import argparse
import io
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

ROOT=Path(__file__).resolve().parents[1]
RP=ROOT/'Hakkai_v7.1.0/ResourcePack'
ART=ROOT/'art_sources/seasonal_garden'
NAMES=('spring_tulip','summer_corn','autumn_squash','ice_blossom','summer_sunflower')
# Each reference is a standalone AI-generated botanical artwork. The four
# crop rectangles provide materials for stem, leaf, flower/fruit and accent.
BOXES={
 'spring_tulip':[(466,912,554,1000),(314,846,426,958),(340,270,410,400),(495,280,550,430)],
 'summer_corn':[(440,536,488,584),(392,740,464,812),(575,760,660,850),(496,80,525,125)],
 'autumn_squash':[(500,806,588,894),(464,164,608,308),(692,606,836,750),(692,606,836,750)],
 'ice_blossom':[(484,1110,540,1166),(332,972,404,1044),(374,266,598,490),(374,266,598,490)],
 'summer_sunflower':[(460,952,540,1032),(268,926,428,1086),(642,204,722,284),(420,270,600,425)]
}

def patch(source,box):
    image=source.crop(box).resize((256,256),Image.Resampling.LANCZOS).convert('RGB')
    # Reference background is neutral charcoal. Do not paint it onto surfaces.
    # Fill isolated charcoal pixels with the material's median colour; this is
    # a simple conservative crop, not semantic segmentation.
    pixels=list(image.getdata());valid=[p for p in pixels if not (max(p)<105 and max(p)-min(p)<18)]
    if len(valid)<len(pixels)*.25: raise ValueError('source crop has insufficient material')
    median=tuple(sorted(p[k] for p in valid)[len(valid)//2] for k in range(3))
    image.putdata([median if max(p)<105 and max(p)-min(p)<18 else p for p in pixels])
    return image

def atlas(name):
    source=Image.open(ART/(name+'_reference.png')).convert('RGB')
    image=Image.new('RGB',(512,512))
    for i,box in enumerate(BOXES[name]): image.paste(patch(source,box),((i%2)*256,(i//2)*256))
    return image

def maps(color,name):
    # Restrained, derived bump; the actual renderer and strength remain untested.
    height=ImageOps.grayscale(color).filter(ImageFilter.GaussianBlur(1.2))
    dx=ImageChops.subtract(ImageChops.offset(height,1,0),ImageChops.offset(height,-1,0),scale=5,offset=128)
    dy=ImageChops.subtract(ImageChops.offset(height,0,1),ImageChops.offset(height,0,-1),scale=5,offset=128)
    normal=Image.merge('RGBA',(dx,dy,Image.new('L',color.size,255),Image.new('L',color.size,255)))
    rough=190 if name=='ice_blossom' else 215
    mer=Image.new('RGBA',color.size,(0,0,rough,255))
    return normal,mer

# Four quadrants with a 4-pixel inset to reduce sampling bleed. All six faces
# explicitly name a material; their axes still require actual Bedrock testing.
UVS=[(4,4),(260,4),(4,260),(260,260)]
def cube(origin,size,material,rotation=None,pivot=None):
    u,v=UVS[material]
    uv={face:{'uv':[u,v],'uv_size':[248,248]} for face in ('north','south','east','west','up','down')}
    item={'origin':origin,'size':size,'uv':uv}
    if rotation:item['pivot']=pivot;item['rotation']=rotation
    return item

def leaf(side,y,length=4,axis=0,width=2.7,tilt=24):
    # Flat cuboids are intentionally nonzero thickness. The family-specific
    # width/tilt makes blades, foliage and icy leaves less interchangeable.
    org=[0,y,-width/2] if side>0 else [-length,y,-width/2]
    return cube(org,[length,.55,width],1,[0,axis,side*tilt],[0,y,0])

def geometry(name,stage):
    height=[4.5,7.0,9.0,11.0][stage]
    if name in ('summer_corn','summer_sunflower'): height=[4.5,7.5,10.0,13.0][stage]
    if name=='autumn_squash': height=[3.5,4.5,5.0,5.5][stage]
    width,tilt={'spring_tulip':(1.4,48),'summer_corn':(1.8,28),'autumn_squash':(3.2,12),
                'ice_blossom':(1.3,36),'summer_sunflower':(3.1,18)}[name]
    def foliage(side,y,length,axis=0):return leaf(side,y,length,axis,width,tilt)
    c=[cube([-.65,0,-.65],[1.3,height,1.3],0),foliage(1,1.5,3.3),foliage(-1,2,3.3)]
    if stage>=1:c.extend([foliage(1,3.0,3.8,90),foliage(-1,3.5,3.8,90)])
    if stage>=2:c.extend([foliage(1,5.0 if name!='autumn_squash' else 2.7,4.2),foliage(-1,5.4 if name!='autumn_squash' else 2.9,4.2)])
    if stage==2:
        if name=='autumn_squash':c.append(cube([-1.5,.7,-1.5],[3,2.8,3],1))
        elif name=='summer_corn':c.append(cube([.7,5.8,-1],[1.8,3.3,2],1,[0,0,-12],[.7,5.8,0]))
        else:c.append(cube([-1.3,height-.5,-1.3],[2.6,2.0,2.6],2))
    if stage==3:
        if name=='spring_tulip':
            # Four outward-leaning petals over a narrower cup, rather than a
            # single solid cube with the whole flower repeated on each face.
            c += [cube([-1.25,10,-1.25],[2.5,1.6,2.5],3),
                  cube([-1.7,10.8,-1.8],[3.4,2.8,.6],2,[-9,0,0],[0,10.8,-1.5]),
                  cube([-1.7,10.8,1.2],[3.4,2.8,.6],2,[9,0,0],[0,10.8,1.5]),
                  cube([-1.8,10.8,-1.2],[.6,2.8,2.4],2,[0,0,9],[-1.5,10.8,0]),
                  cube([1.2,10.8,-1.2],[.6,2.8,2.4],2,[0,0,-9],[1.5,10.8,0])]
        elif name=='summer_corn':
            c += [cube([1,6,-1.25],[2.8,5,2.5],2),cube([.8,6,-1.7],[.6,4,3.4],1),
                  cube([3.5,6,-1.7],[.6,4,3.4],1),
                  cube([-.3,12.8,-.3],[.6,2.1,.6],3),
                  cube([-.23,13,-.23],[.46,1.8,.46],3,[0,0,35],[0,13,0]),
                  cube([-.23,13,-.23],[.46,1.8,.46],3,[0,0,-35],[0,13,0]),
                  cube([-.23,13,-.23],[.46,1.8,.46],3,[35,0,0],[0,13,0]),
                  cube([-.23,13,-.23],[.46,1.8,.46],3,[-35,0,0],[0,13,0])]
        elif name=='autumn_squash':
            # A low, softly stepped fruit with leaves around it, not a tall stalk.
            # The side strips meet the centre without co-planar overlapping
            # top faces, avoiding the previous two crossing fruit cuboids.
            c = [cube([-2.5,.4,-3],[5,4.7,6],2),cube([-3,.4,-2.5],[.5,4.7,5],2),cube([2.5,.4,-2.5],[.5,4.7,5],2),
                 cube([-2.3,5.1,-2.3],[4.6,.6,4.6],2),cube([-.6,5.7,-.6],[1.2,1.2,1.2],0),
                 cube([-5.5,.4,-1.5],[2.5,.45,3],1),cube([3,.4,-1.5],[2.5,.45,3],1),
                 cube([-1.5,.4,-5.5],[3,.45,2.5],1),cube([-1.5,.4,3],[3,.45,2.5],1)]
        elif name=='ice_blossom':
            # Narrow, upward crystals with a radial spread around the centre.
            c += [cube([-.8,10,-.8],[1.6,3.6,1.6],3),
                  cube([.45,10,-.55],[1,3.3,1.1],2,[0,0,-30],[.45,10,0]),
                  cube([-1.45,10,-.55],[1,3.3,1.1],2,[0,0,30],[-.45,10,0]),
                  cube([-.55,10,.45],[1.1,3.3,1],2,[30,0,0],[0,10,.45]),
                  cube([-.55,10,-1.45],[1.1,3.3,1],2,[-30,0,0],[0,10,-.45]),
                  cube([.35,10,.35],[.8,2.6,.8],2,[22,0,-22],[.35,10,.35]),
                  cube([-.95,10,-.95],[.8,2.6,.8],2,[-22,0,22],[-.35,10,-.35])]
        elif name=='summer_sunflower':
            # Thin radial petals around the seed disc instead of a square ring.
            c += [cube([-1.7,10.4,-.8],[3.4,3.4,1.6],3)]
            for angle in range(0,360,30):
                c.append(cube([-.36,12.4,-.45],[.72,2.5,.9],2,[0,0,angle],[0,12.1,0]))
    return {'description':{'identifier':f'geometry.hakkai.{name}_{stage}','texture_width':512,'texture_height':512},'bones':[{'name':'plant','pivot':[0,0,0],'cubes':c}]}

def png(image):
    buffer=io.BytesIO();image.save(buffer,format='PNG',optimize=True);return buffer.getvalue()

def outputs():
    out={RP/'models/blocks/field_crops.geo.json':(json.dumps({'format_version':'1.12.0','minecraft:geometry':[geometry(n,s) for n in NAMES for s in range(4)]},ensure_ascii=False,indent=2)+'\n').encode()}
    for name in NAMES:
        color=atlas(name);normal,mer=maps(color,name);folder=RP/'textures/blocks'
        out[folder/f'hakkai_{name}.png']=png(color)
        out[folder/f'hakkai_{name}_n.png']=png(normal)
        out[folder/f'hakkai_{name}_mer.png']=png(mer)
    return out

def previews():
    # Static orthographic diagnostics, not Bedrock renders: animation,
    # alpha, Euler ordering and intersecting face sorting may differ.
    from preview_mob_geometry import collect,render
    result={}
    for name in NAMES:
        texture=atlas(name).convert('RGBA')
        stages_geo=[geometry(name,stage) for stage in range(4)]
        framing=[point for model in stages_geo for quad,_ in collect(model) for point in quad]
        mature=render(geometry(name,3),texture,300,depth_buffer=True)
        result[ART/f'previews/{name}_mature.png']=png(mature)
        stages=Image.new('RGB',(1200,320),(24,27,31));draw=ImageDraw.Draw(stages)
        for stage in range(4):
            image=render(stages_geo[stage],texture,150,framing=framing,depth_buffer=True)
            stages.paste(image,(stage*300,20));draw.text((stage*300+8,4),f'stage {stage}',fill='white')
        result[ART/f'previews/{name}_stages.png']=png(stages)
    return result

def main():
    parser=argparse.ArgumentParser(description=__doc__);group=parser.add_mutually_exclusive_group(required=True);group.add_argument('--write',action='store_true');group.add_argument('--check',action='store_true');args=parser.parse_args()
    result={**outputs(),**previews()};mismatch=[]
    for path,data in result.items():
        if args.write:path.write_bytes(data)
        elif not path.exists() or path.read_bytes()!=data:mismatch.append(str(path.relative_to(ROOT)))
    if mismatch:raise SystemExit('Stale crop visuals: '+', '.join(mismatch))
    print(f'{len(NAMES)} crop prototypes, 20 stage geometries, 15 texture maps and 10 static previews '+('written' if args.write else 'match')+' (static only)')
if __name__=='__main__':main()
