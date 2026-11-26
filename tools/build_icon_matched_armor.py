#!/usr/bin/env python3
"""Build icon-derived wearable armor prototypes (Pillow required).

Only wearable visuals are touched with --write. Item icons, behavior, recipes,
materials, parent animation and glint are unchanged. Textures are derived from
existing 128px item illustrations; enlarged UVs are not new HD paintings.
Approximate front previews are NOT Bedrock rendering or an animation test.
"""
import argparse,copy,json,statistics
from collections import deque
from pathlib import Path
from PIL import Image,ImageDraw,ImageOps,ImageEnhance
from create_series_armor import normals
ROOT=Path(__file__).resolve().parents[1];PACK=ROOT/'Hakkai_v7.1.0';BP=PACK/'BehaviorPack';RP=PACK/'ResourcePack';EQ=RP/'textures/hakkai/equipment';ICONS=RP/'textures/items'
SLOTS={'slot.armor.head':'helmet','slot.armor.chest':'chest','slot.armor.legs':'leggings','slot.armor.feet':'boots'}
UV={'main':(0,0,16,24),'back':(16,0,16,24),'side':(32,0,8,24),'top':(40,0,8,8),'detail':(40,8,16,16),'left':(0,24,8,24),'right':(8,24,8,24),'trim':(16,24,8,8),'toeleft':(24,24,12,12),'toeright':(36,24,12,12)}
FACES={'north':'main','south':'back','east':'side','west':'side','up':'top','down':'top'}

def wearable_items():
    atlas=json.loads((RP/'textures/item_texture.json').read_text(encoding='utf8'))['texture_data'];result=[]
    for path in sorted((BP/'items').glob('*.json')):
        entry=json.loads(path.read_text(encoding='utf8'))['minecraft:item'];c=entry['components'];w=c.get('minecraft:wearable')
        if not w:continue
        part=SLOTS[w['slot']];icon=c['minecraft:icon'];icon=icon if isinstance(icon,str) else icon['textures']['default']
        source=RP/(atlas[icon]['textures']+'.png');attach=RP/'attachables'/path.name
        desc=json.loads(attach.read_text(encoding='utf8'))['minecraft:attachable']['description']
        assert desc['identifier']==entry['description']['identifier'] and desc['textures']['default']==f'textures/hakkai/equipment/{path.stem}'
        if not source.is_file():raise ValueError(source)
        result.append((path.stem,part,source))
    return result

def face_uv(front):
    out={}
    for face,region in FACES.items():
        selected=front if face=='north' else region
        x,y,w,h=UV[selected] if isinstance(selected,str) else selected
        out[face]={'uv':[x,y],'uv_size':[w,h]}
    return out

def geometry(part):
    def cube(origin,size,front='main',inflate=0,rotation=None,pivot=None):
        return {'origin':origin,'size':size,'uv':face_uv(front),**({'inflate':inflate} if inflate else {}),
                **({'rotation':rotation,'pivot':pivot} if rotation is not None else {})}
    def aligned(region,base_origin,base_size,inflate,origin,size):
        # Subrect of the underlying north face, including its inflated extent.
        # This avoids repeating or shifting the emblem on raised plates.
        u,v,w,h=UV[region];bx,by,_=base_origin;bw,bh,_=base_size;x,y,_=origin;cw,ch,_=size
        fullw=bw+2*inflate;fullh=bh+2*inflate
        return (u+(bx+bw+inflate-x-cw)/fullw*w,v+(by+bh+inflate-y-ch)/fullh*h,cw/fullw*w,ch/fullh*h)
    bones=[{'name':'waist','pivot':[0,12,0]},{'name':'body','parent':'waist','pivot':[0,24,0]},
           {'name':'head','parent':'body','pivot':[0,24,0]}, {'name':'rightArm','parent':'body','pivot':[-5,22,0]},
           {'name':'leftArm','parent':'body','pivot':[5,22,0]}, {'name':'rightLeg','parent':'body','pivot':[-1.9,12,0]},
           {'name':'leftLeg','parent':'body','pivot':[1.9,12,0]}]
    b={x['name']:x for x in bones}
    if part=='helmet':
        b['head']['cubes']=[cube([-4,24,-4],[8,8,8],inflate=.65),
          cube([-3.1,28,-4.9],[6.2,2.4,.45],aligned('main',[-4,24,-4],[8,8,8],.65,[-3.1,28,-4.9],[6.2,2.4,.45])),
          cube([-2.4,25.1,-4.9],[4.8,2.8,.45],aligned('main',[-4,24,-4],[8,8,8],.65,[-2.4,25.1,-4.9],[4.8,2.8,.45])),
          cube([-1.0,31.4,-4.5],[2,2.2,6],'trim'),
          cube([-.62,33.3,-4.3],[1.24,1.2,4.7],'trim'),
          cube([-.32,34.25,-4.1],[.64,1,3.6],'trim'),
          cube([-5.2,25.3,-3.1],[1,5,5],'left'),cube([4.2,25.3,-3.1],[1,5,5],'right'),
          cube([-5.9,28,-.7],[1,3,2],'trim'),cube([4.9,28,-.7],[1,3,2],'trim'),
          cube([-6.25,29.7,-.9],[1.15,2.7,2.2],'left',rotation=[0,0,-15],pivot=[-5.2,29.7,0]),
          cube([5.1,29.7,-.9],[1.15,2.7,2.2],'right',rotation=[0,0,15],pivot=[5.2,29.7,0])]
    elif part=='chest':
        b['body']['cubes']=[cube([-4,12,-2],[8,12,4],inflate=.65),
          cube([-3,16,-2.96],[6,5.5,.35],aligned('main',[-4,12,-2],[8,12,4],.65,[-3,16,-2.96],[6,5.5,.35])),
          cube([-2.4,13,-3.0],[4.8,2.8,.4],aligned('main',[-4,12,-2],[8,12,4],.65,[-2.4,13,-3.0],[4.8,2.8,.4])),
          cube([-3,22.5,-2.92],[6,1.5,.55],aligned('main',[-4,12,-2],[8,12,4],.65,[-3,22.5,-2.92],[6,1.5,.55]))]
        for name,x,front,u in [('rightArm',-8,'left',0),('leftArm',4,'right',8)]:
            outward=-1 if name=='rightArm' else 1
            # The painted icon shows pauldrons, not an opaque metal sleeve to
            # the wrist. Leave the lower arm to the player's own skin/clothes.
            b[name]['cubes']=[cube([x,18.3,-2],[4,5.7,4],(u,24,8,9),inflate=.6),
              cube([x-.45,20.5,-2.65],[4.9,3.0,5.3],(u,24,8,8)),
              cube([x-.4,19.5,-2.75],[4.8,1.1,5.4],(u,30,8,3)),
              cube([x-.25,18.6,-2.6],[4.5,1.0,5.2],(u,32,8,3)),
              cube([x-1.15 if outward<0 else x+3.25,20.1,-2.55],[1.9,2.8,5.1],(u,26,8,7),
                   rotation=[0,0,outward*14],pivot=[x+.5 if outward<0 else x+3.5,22.5,0])]
    elif part=='leggings':
        b['body']['cubes']=[cube([-4,12,-2],[8,4,4],'trim',inflate=.35),cube([-3.5,13,-2.8],[7,2,.5],aligned('trim',[-4,12,-2],[8,4,4],.35,[-3.5,13,-2.8],[7,2,.5]))]
        for name,x,front,u in [('rightLeg',-3.9,'left',0),('leftLeg',-.1,'right',8)]:
            b[name]['cubes']=[cube([x,0,-2],[4,12,4],front,inflate=.35),
              cube([x+.45,6.5,-2.9],[3.1,3,.5],aligned(front,[x,0,-2],[4,12,4],.35,[x+.45,6.5,-2.9],[3.1,3,.5])),
              cube([x+.3,10,-2.8],[3.4,1.4,.4],aligned(front,[x,0,-2],[4,12,4],.35,[x+.3,10,-2.8],[3.4,1.4,.4]))]
    elif part=='boots':
        for name,x,front,u,toe in [('rightLeg',-3.9,'left',0,'toeleft'),('leftLeg',-.1,'right',8,'toeright')]:
            # The icons show tall shin guards, not short ankle boots. Raise
            # the shaft moderately while retaining a separate projecting toe;
            # leave part of the leggings visible in a combined set.
            b[name]['cubes']=[cube([x,0,-2],[4,5.7,4],front,inflate=.7),
              cube([x-.2,0,-3.4],[4.4,1.8,1.5],toe),
              cube([x+.15,1.9,-2.95],[3.7,3.4,.35],aligned(front,[x,0,-2],[4,5.7,4],.7,[x+.15,1.9,-2.95],[3.7,3.4,.35])),
              cube([x-.1,5.3,-2.85],[4.2,1.0,.4],aligned(front,[x,0,-2],[4,5.7,4],.7,[x-.1,5.3,-2.85],[4.2,1.0,.4]))]
    else:raise ValueError(part)
    return {'description':{'identifier':'geometry.hakkai.icon_armor_'+part,'texture_width':64,'texture_height':64,'visible_bounds_width':3,'visible_bounds_height':3,'visible_bounds_offset':[0,1,0]},'bones':bones}

def extend_material(crop):
    """Extend opaque material to transparent margins, avoiding flat-color gaps.

    Operates inside each tight crop so unrelated corner decorations are not
    used. RGB under transparent antialiasing is not reliable; use solid interior
    samples and flood the nearest four-connected pixel outwards.
    """
    crop=crop.convert('RGBA');w,h=crop.size;pixels=list(crop.getdata());owners=[-1]*(w*h);queue=deque()
    for i,(*_,alpha) in enumerate(pixels):
        if alpha>=240:owners[i]=i;queue.append(i)
    if not queue:raise ValueError('armor material crop contains no opaque pixels')
    while queue:
        i=queue.popleft();x=i%w;y=i//w
        for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0<=nx<w and 0<=ny<h:
                j=ny*w+nx
                if owners[j]<0:owners[j]=owners[i];queue.append(j)
    out=Image.new('RGBA',crop.size);out.putdata([(*pixels[owner][:3],255) for owner in owners]);return out

def render_texture(icon,part,size):
    image=Image.open(icon).convert('RGBA').resize((128,128),Image.Resampling.LANCZOS)
    # Attribute marks are in the extreme corners; sample only the actual armor.
    samples=[(r,g,b) for r,g,b,a in image.crop((32,25,96,105)).getdata() if a>=200]
    if not samples:raise ValueError(f'no armor pixels: {icon}')
    rgb=tuple(int(statistics.median(c[i] for c in samples)*.72) for i in range(3))
    tex=Image.new('RGBA',(size,size),(*rgb,255));scale=size/64
    crops={
      # Keep the actual central breastplate and jewel, not the icon's
      # lower-right level badge or the bright fringe outside its torso. Fit
      # crops the top/bottom further; the angular tip is still only inferred.
      'chest':{'main':(38,12,88,104),'left':(21,20,44,55),'right':(84,20,113,55),'detail':(40,42,88,99),'trim':(40,9,88,29),'back':(35,35,48,108),'side':(80,35,94,108)},
      'helmet':{'main':(51,28,89,109),'left':(28,27,59,102),'right':(66,24,99,101),'detail':(38,37,94,93),'trim':(61,6,79,59),'back':(48,35,68,67),'side':(30,32,58,98)},
      # The leg icons continue well below the knees. Cropping at y=76 used
      # to stretch only the thighs over the entire legs, pushing the kneecaps
      # down to the ankles. Include the upper shins while leaving boot artwork
      # and the small corner marks out of these leg surfaces.
      'leggings':{'main':(35,8,90,112),'left':(36,10,62,100),'right':(63,10,91,100),'detail':(40,8,85,35),'trim':(37,9,88,25),'back':(40,20,57,58),'side':(69,20,83,57)},
      'boots':{'main':(40,8,97,84),'left':(41,8,67,83),'right':(69,8,97,83),'detail':(40,17,95,82),'trim':(42,9,96,26),'toeleft':(19,76,67,113),'toeright':(52,79,98,115),'back':(44,20,63,70),'side':(72,20,91,72)}
    }[part]
    def region(name,box,shade=1,area=None,symmetric=False):
        x,y,w,h=area or UV[name];xy=(round(x*scale),round(y*scale));wh=(round(w*scale),round(h*scale))
        material=extend_material(image.crop(box))
        if symmetric:
            half=ImageOps.fit(material,(wh[0]//2,wh[1]),Image.Resampling.LANCZOS,centering=(.5,.5))
            img=Image.new('RGBA',wh);img.paste(half,(0,0));img.paste(ImageOps.mirror(half),(wh[0]//2,0))
        else:img=ImageOps.fit(material,wh,Image.Resampling.LANCZOS,centering=(.5,.5))
        if shade!=1:
            alpha=img.getchannel('A');img=ImageEnhance.Brightness(img.convert('RGB')).enhance(shade).convert('RGBA');img.putalpha(alpha)
        # Blend transparent source pixels against a solid material-toned base.
        tex.alpha_composite(img,xy)
    # The helmet icon is a three-quarter portrait. Build a symmetric visor from
    # its front half instead of painting the whole side-view across the head.
    region('main',crops['main'],symmetric=part=='helmet')
    # Back/side art is inferred from non-emblem parts of the icon: avoid
    # duplicating the front jewel on the back, arms, and side surfaces.
    region('back',crops['back'],.80,symmetric=True);region('side',crops['side'],.85);region('top',crops['trim'],.85)
    for name in ('detail','trim'):region(name,crops[name])
    if part=='boots':
        for name in ('toeleft','toeright'):region(name,crops[name])
    for name in ('left','right'):
        x,y,w,h=UV[name]
        # Sleeves retain a quiet lower section; shoulder art occupies the top.
        area=(x,y,w,9) if part=='chest' else None
        region(name,crops[name],area=area)
    return tex

def texture_maps(image):
    # The UV atlas places unrelated materials directly beside each other.
    # Blur/height gradients must not cross those boundaries: sampling a bright
    # front against a dark back invents a ridge along the UV seam. Compute each
    # region separately; this only reduces cross-island artifacts, it does not
    # make a physically correct normal map or eliminate the visible UV seam.
    scale=image.width/64
    if image.width!=image.height or scale!=int(scale):raise ValueError('expected a square integer-scaled 64px atlas')
    normal=Image.new('RGBA',image.size,(128,128,255,255))
    normal.putalpha(image.getchannel('A'))
    for x,y,w,h in UV.values():
        box=tuple(round(v*scale) for v in (x,y,x+w,y+h))
        normal.paste(normals(image.crop(box)),box[:2])
    mer=Image.new('RGBA',image.size,(72,0,165,255))
    return normal,mer

def preview_piece(image,part):
    # A front orthographic sketch using north-face UVs, not Bedrock animation.
    scale=5;out=Image.new('RGBA',(130,180),(0,0,0,0));geom=geometry(part);cubes=[]
    for b in geom['bones']:
        for c in b.get('cubes',[]):cubes.append(c)
    for c in sorted(cubes,key=lambda q:q['origin'][2],reverse=True):
        x,y,z=c['origin'];w,h,_=c['size'];inf=c.get('inflate',0);box=c['uv']['north'];u,v=box['uv'];uw,uv=box['uv_size'];s=image.width/64
        patch=image.crop((round(u*s),round(v*s),round((u+uw)*s),round((v+uv)*s)))
        ww=max(1,round((w+inf*2)*scale));hh=max(1,round((h+inf*2)*scale));patch=patch.resize((ww,hh),Image.Resampling.LANCZOS)
        out.alpha_composite(patch,(round((x-inf+13)*scale),round((34-(y+h+inf))*scale)))
    return out

def turnaround(image,part):
    # Scale UV coordinates to actual image resolution for the diagnostic
    # renderer. Its face ordering and lighting are approximations, not Bedrock.
    from preview_mob_geometry import render
    model=copy.deepcopy(geometry(part));scale=image.width/64
    for bone in model['bones']:
        for cube in bone.get('cubes',[]):
            for face in cube['uv'].values():
                for key in ('uv','uv_size'):face[key]=[v*scale for v in face[key]]
    return render(model,image,300,depth_buffer=True)

def assembled_turnaround(images):
    """Diagnostic mannequin with all four pieces and their own texture tiles.

    A neutral mannequin is intentionally included to reveal uncovered arms,
    the leg/boot junction and overlaps; it is not the player's actual skin.
    Like the other preview, this is not the Bedrock renderer or animation.
    """
    from preview_mob_geometry import render
    order=('helmet','chest','leggings','boots');atlas=Image.new('RGBA',(768,512),(0,0,0,255))
    base=copy.deepcopy(geometry('chest'));bones={b['name']:b for b in base['bones']}
    for b in bones.values():b.pop('cubes',None)
    player=[('head',[-4,24,-4],[8,8,8],(190,151,124,255)),('body',[-4,12,-2],[8,12,4],(53,81,106,255)),
            ('rightArm',[-8,12,-2],[4,12,4],(190,151,124,255)),('leftArm',[4,12,-2],[4,12,4],(190,151,124,255)),
            ('rightLeg',[-3.9,0,-2],[4,12,4],(55,65,79,255)),('leftLeg',[-.1,0,-2],[4,12,4],(55,65,79,255))]
    draw=ImageDraw.Draw(atlas)
    for i,(bone,origin,size,color) in enumerate(player):
        u=512+i*4;draw.rectangle((u,0,u+2,2),fill=color)
        face={key:{'uv':[u,0],'uv_size':[2,2]} for key in FACES}
        bones[bone].setdefault('cubes',[]).append({'origin':origin,'size':size,'uv':face})
    for i,part in enumerate(order):
        x=(i%2)*256;y=(i//2)*256
        atlas.paste(images[part].resize((256,256),Image.Resampling.LANCZOS),(x,y))
        for bone in geometry(part)['bones']:
            for cube in bone.get('cubes',[]):
                cube=copy.deepcopy(cube)
                for face in cube['uv'].values():
                    face['uv']=[face['uv'][0]*4+x,face['uv'][1]*4+y]
                    face['uv_size']=[v*4 for v in face['uv_size']]
                bones[bone['name']].setdefault('cubes',[]).append(cube)
    return render(base,atlas,360,depth_buffer=True)

def write_json(path,obj):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--write',action='store_true');args=parser.parse_args()
    items=wearable_items();assert len(items)==106
    if args.write:
        write_json(RP/'models/entity/hakkai_icon_armor.geo.json',{'format_version':'1.16.0','minecraft:geometry':[geometry(part) for part in SLOTS.values()]})
    previews={};images={};sample={'gear_010','gear_011','gear_012','series_leggings_00','ult_chest','ult_helmet','ult_leggings','ult_boots'}
    for name,part,source in items:
        size=256 if name.startswith('ult_') else 128;im=render_texture(source,part,size)
        if name in sample:previews[name]=preview_piece(im,part);images[name]=im
        if name.startswith('ult_'):
            dest=ROOT/'art_sources/armor_wear_previews'/f'{name}_turn.png';dest.parent.mkdir(parents=True,exist_ok=True)
            turnaround(im,part).save(dest)
        if args.write:
            im.save(EQ/f'{name}.png');normal,mer=texture_maps(im);normal.save(EQ/f'{name}_n.png');mer.save(EQ/f'{name}_mer.png')
            write_json(EQ/f'{name}.texture_set.json',{'format_version':'1.16.100','minecraft:texture_set':{'color':name,'normal':name+'_n','metalness_emissive_roughness':name+'_mer'}})
            ap=RP/'attachables'/f'{name}.json';a=json.loads(ap.read_text(encoding='utf8'));a['minecraft:attachable']['description']['geometry']['default']='geometry.hakkai.icon_armor_'+part;write_json(ap,a)
    preview=Image.new('RGB',(800,430),(65,65,65));d=ImageDraw.Draw(preview)
    for index,(label,names) in enumerate([('series 00',['gear_011','gear_010','series_leggings_00','gear_012']),('ultimate',['ult_helmet','ult_chest','ult_leggings','ult_boots'])]):
        x=index*400;d.text((x+10,8),label,fill='white');combined=Image.new('RGBA',(130,180));
        for name in names:combined.alpha_composite(previews[name])
        preview.paste(combined.resize((260,360),Image.Resampling.NEAREST),(x+130,40),combined.resize((260,360),Image.Resampling.NEAREST))
        for j,name in enumerate(names):
            icon=Image.open(ICONS/f'hakkai_{name}.png').convert('RGBA').resize((75,75),Image.Resampling.LANCZOS);preview.paste(icon,(x+10,40+j*88),icon)
    dest=ROOT/'art_sources/armor_wear_previews/front_comparison.png';dest.parent.mkdir(parents=True,exist_ok=True);preview.save(dest)
    for label,names in [('series_00',('gear_011','gear_010','series_leggings_00','gear_012')),('ultimate',('ult_helmet','ult_chest','ult_leggings','ult_boots'))]:
        assembled_turnaround(dict(zip(('helmet','chest','leggings','boots'),(images[name] for name in names)))).save(dest.parent/f'{label}_assembled.png')
    print(f'{len(items)} wearable entries; '+('updated wearable visuals' if args.write else 'preview only'))
if __name__=='__main__':main()
