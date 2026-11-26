#!/usr/bin/env python3
"""Three hand-designed forest wildlife geometry/texture prototypes.

The rigs and cuboids are authored here rather than generated from a shared
animal skeleton. The materials are procedurally drawn, not finished paintings.
Only these three geometry files and their existing color/MER/normal maps are
written. AI, collisions, drops and spawning are untouched. Requires Pillow.
"""
import argparse, copy, json, random
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter
from build_guardian_appearances import face_sizes, fits, paste_with_gutter, bytes_png

ROOT=Path(__file__).resolve().parents[1];RP=ROOT/'Hakkai_v7.1.0/ResourcePack';SIZE=1024

def c(origin,size,mat):return {'origin':origin,'size':size,'material':mat}
def bone(name,pivot,cubes,parent=None):
    b={'name':name,'pivot':pivot,'cubes':cubes}
    if parent:b['parent']=parent
    return b

def bird():
    # Feathered pear-shaped body, layered wings with distinct hinged tips,
    # short beak, crest and tail fan. Side-facing eyes are painted per face.
    b=[bone('body',[0,5,0],[c([-2.4,3,-3],[4.8,4.4,6.4],'bird_body'),c([-2,2.6,-2],[4,1,4],'bird_belly')]),
       bone('head',[0,6,-2.5],[c([-2,5.7,-5],[4,3.5,3.5],'bird_head'),c([-.7,6,-6.6],[1.4,.9,1.8],'beak'),c([-.5,9,-3.8],[1,1.4,1.6],'crest')],'body'),
       bone('tail',[0,4.5,3],[c([-1.4,4.1,2.8],[2.8,.7,3],'bird_feather'),c([-2,3.9,5.2],[4,.7,2.4],'bird_feather')],'body')]
    for side,sign in [('l',-1),('r',1)]:
        x=-5.6 if sign<0 else 2.2
        tipx=-8 if sign<0 else 5.2
        b.append(bone('wing_'+side,[sign*2.2,5.8,0],[c([x,5,-2],[3.4,.8,4.5],'bird_wing'),c([x,4.7,1.8],[3.4,.55,1.3],'bird_feather')],'body'))
        b.append(bone('wing_'+side+'_tip',[sign*5.3,5.4,0],[c([tipx,5,-1.6],[2.8,.65,3.8],'bird_feather'),c([tipx,4.8,1.7],[2.4,.5,1.1],'bird_feather')],'wing_'+side))
    for i,x in enumerate((-1.2,1.2)):
        b.append(bone('leg_'+str(i),[x,3.2,.7],[c([x-.35,0,.35],[.7,3.2,.7],'bird_leg'),c([x-.55,0,-.5],[1.1,.45,1.6],'bird_leg')],'body'))
    return b

def mouse():
    # Four-legged dormouse rather than the old six-legged insect. The moss
    # cap is layered and the tail has three independently articulated joints.
    b=[bone('body',[0,3,0],[c([-3.2,1.8,-2.8],[6.4,4,7.4],'mouse_fur'),c([-2.6,1.5,-2],[5.2,.6,5.5],'mouse_belly')]),
       bone('head',[0,4,-2.8],[c([-2.3,2.8,-5.5],[4.6,3.5,3.5],'mouse_fur'),c([-1,2.8,-6.5],[2,1.3,1.4],'mouse_muzzle'),c([-.35,3.5,-6.8],[.7,.5,.5],'mouse_nose'),c([-2.6,5.4,-4.5],[1.4,1.7,1.2],'mouse_ear'),c([1.2,5.4,-4.5],[1.4,1.7,1.2],'mouse_ear')],'body'),
       bone('moss_cap',[0,5.7,.2],[c([-2.9,5.5,-2.4],[5.8,.8,6.4],'moss'),c([-2.3,6.2,-1.7],[4.6,.5,4.8],'moss'),c([-1.6,6.6,.1],[3.2,.5,2],'moss_bud')],'body'),
       bone('tail',[0,3.4,4.2],[c([-.8,2.8,4],[1.6,1.6,3.2],'mouse_tail')],'body'),
       bone('tail_mid',[0,3.5,6.8],[c([-.65,3,6.5],[1.3,1.3,3],'mouse_tail')],'tail'),
       bone('tail_tip',[0,3.5,9],[c([-.5,3.1,8.9],[1,1,2],'mouse_tail'),c([-.65,3,10.3],[1.3,1.2,1],'mouse_belly')],'tail_mid')]
    for i,(x,z) in enumerate([(-2.1,-1.5),(2.1,-1.5),(-2.1,3.2),(2.1,3.2)]):
        b.append(bone('leg_'+str(i),[x,2.4,z],[c([x-.65,0,z-.65],[1.3,2.5,1.3],'mouse_fur'),c([x-.75,0,z-1],[1.5,.5,1.8],'mouse_muzzle')],'body'))
    return b

def hunter():
    # Lean wolf-like hunter with shoulder mane, long muzzle, hocks and tail.
    b=[bone('body',[0,7,0],[c([-2.5,5,-3.5],[5,5.2,9],'hunter_fur'),c([-3,6,-3.8],[6,4.6,3.5],'hunter_mane')]),
       bone('head',[0,8,-3],[c([-2,7,-6.7],[4,3.8,4.3],'hunter_head'),c([-1.3,7,-9],[2.6,1.8,2.8],'hunter_muzzle'),c([-1.6,10.5,-5.8],[1.1,2,1.2],'hunter_ear'),c([.5,10.5,-5.8],[1.1,2,1.2],'hunter_ear')],'body'),
       bone('tail',[0,8,5],[c([-.8,7.2,5],[1.6,1.6,3],'hunter_fur')],'body'),
       bone('tail_tip',[0,8,7.8],[c([-1,7,7.7],[2,2,3.2],'hunter_mane'),c([-.8,7.2,10.4],[1.6,1.6,1],'hunter_tip')],'tail'),
       bone('mane_ridge',[0,10,-2],[c([-2.3,10,-3.2],[4.6,1,3.2],'hunter_mane'),c([-1.5,10.8,-2.5],[3,.7,1.4],'hunter_mane')],'body')]
    for i,(x,z) in enumerate([(-1.8,-2.3),(1.8,-2.3),(-1.8,4),(1.8,4)]):
        b.append(bone('leg_'+str(i),[x,6,z],[c([x-.7,2.7,z-.7],[1.4,3.5,1.4],'hunter_fur')],'body'))
        b.append(bone('hock_'+str(i),[x,2.8,z],[c([x-.55,.5,z-.55],[1.1,2.3,1.1],'hunter_dark'),c([x-.8,0,z-1.15],[1.6,.8,1.8],'hunter_dark')],'leg_'+str(i)))
    return b

DESIGNS=[bird,mouse,hunter]
PALETTE={
 'bird_body':(105,151,153),'bird_belly':(192,210,192),'bird_head':(86,133,141),'bird_feather':(165,195,186),'bird_wing':(78,125,128),'bird_leg':(81,83,68),'beak':(206,170,101),'crest':(192,212,192),
 'mouse_fur':(129,110,85),'mouse_belly':(211,194,159),'mouse_muzzle':(195,172,139),'mouse_nose':(155,105,95),'mouse_ear':(163,127,115),'mouse_tail':(130,109,91),'moss':(73,116,68),'moss_bud':(131,158,84),
 'hunter_fur':(62,70,83),'hunter_head':(68,75,89),'hunter_mane':(88,96,110),'hunter_muzzle':(119,126,131),'hunter_ear':(85,77,88),'hunter_dark':(46,52,63),'hunter_tip':(159,174,179),
}

def tint(rgb,n):return tuple(max(0,min(255,int(a+n))) for a in rgb)
def surface(mat,w,h,seed,face,base_name,cube_index):
    rng=random.Random(seed);base=PALETTE[mat]
    light={'up':12,'down':-13,'north':2,'south':-1,'west':-5,'east':0}[face]
    im=Image.new('RGBA',(w,h),(*tint(base,light),255));d=ImageDraw.Draw(im)
    # A restrained vertical value gradient adds readable volume without
    # pretending a large PNG alone is high-resolution artwork.
    for y in range(h):
        shade=light+6-12*y/max(1,h-1)
        d.line((0,y,w-1,y),fill=(*tint(base,shade),255))
    # Individually authored material vocabulary: short fur, long feather
    # contours, leaf clusters and subtle striated horn/beak.
    n=max(6,w*h//80)
    if mat.startswith('moss'):
        for j in range(n):
            x=rng.randrange(w);y=rng.randrange(h);r=rng.randint(1,max(1,min(w,h)//24))
            d.ellipse((x-r,y-r,x+r,y+r),fill=(*tint(base,rng.choice([-20,-10,9,18,25])+light),255))
    elif 'feather' in mat or mat=='bird_wing':
        for j in range(max(4,w//8)):
            x=int((j+.5)*w/max(4,w//8));col=(*tint(base,light+(-20 if j%2 else 16)),255)
            d.line([(x,0),(max(0,x-2),h*.55),(min(w-1,x+2),h-1)],fill=col,width=max(1,w//140))
            d.line((x,h*.55,min(w-1,x+w*.08),h*.42),fill=col,width=1)
    else:
        for j in range(n):
            x=rng.randrange(w);y=rng.randrange(h);length=rng.randint(1,5)
            col=(*tint(base,light+rng.choice([-16,-10,8,14])),255)
            d.line((x,y,min(w-1,x+1),min(h-1,y+length)),fill=col,width=1)
    # Face-painted eyes are not decals on all faces or every cube.
    if base_name=='head' and cube_index==0 and face in ('west','east') and not mat.startswith(('statue_','storm_rock','ice_wolf_fur','storm_bird_fur')):
        cx=w*.43;cy=h*.39;r=max(2,min(w,h)*.11)
        d.ellipse((cx-r*1.2,cy-r*1.2,cx+r*1.2,cy+r*1.2),fill=(220,207,157,255) if mat=='hunter_head' else (218,215,191,255))
        d.ellipse((cx-r,cy-r,cx+r,cy+r),fill=(28,31,34,255))
        d.ellipse((cx-r*.3,cy-r*.6,cx+r*.05,cy-r*.2),fill=(244,245,229,255))
    if mat in ('ice_antler','ice_claw'):
        # Fine frost facets in a different material from the animals' fur.
        d.line([(w*.14,h*.83),(w*.48,h*.18),(w*.79,h*.77)],fill=(*tint(base,24),255),width=max(1,w//65))
        d.line((w*.48,h*.18,w*.51,h*.9),fill=(*tint(base,-24),255),width=max(1,w//95))
    if mat=='ice_deer_fur' and base_name=='body' and face in ('west','east'):
        # Frost-rune diamond is readable on the flank.
        cx=w*.5;cy=h*.45;rx=w*.16;ry=h*.26
        d.line([(cx,cy-ry),(cx+rx,cy),(cx,cy+ry),(cx-rx,cy),(cx,cy-ry)],fill=(224,242,240,255),width=max(2,w//55))
        d.line((cx,cy-ry,cx,cy+ry),fill=(224,242,240,255),width=max(1,w//100))
    if mat in ('ice_wolf_fur','storm_bird_fur') and base_name=='head' and cube_index==0 and face in ('west','east'):
        # Narrow angled eye, rather than the round pupil of the small animals.
        d.polygon([(w*.25,h*.29),(w*.63,h*.35),(w*.58,h*.49),(w*.31,h*.48)],fill=(33,41,49,255))
        col=(170,232,240,255) if mat=='ice_wolf_fur' else (245,195,91,255)
        d.polygon([(w*.30,h*.34),(w*.57,h*.38),(w*.53,h*.45),(w*.34,h*.45)],fill=col)
        d.line((w*.44,h*.36,w*.44,h*.46),fill=(28,31,33,255),width=max(1,w//80))
        if mat=='ice_wolf_fur':d.line([(w*.2,h*.67),(w*.45,h*.76),(w*.73,h*.62)],fill=(205,227,230,255),width=max(1,w//60))
    if mat=='storm_rock':
        d.line([(w*.15,h*.18),(w*.3,h*.35),(w*.26,h*.56),(w*.43,h*.74)],fill=(*tint(base,-28),255),width=max(1,w//75))
        if base_name=='head' and cube_index==0 and face in ('north','south'):
            for cx in (.3,.7):
                d.rectangle((w*(cx-.12),h*.35,w*(cx+.12),h*.5),fill=(33,35,41,255))
                d.rectangle((w*(cx-.08),h*.39,w*(cx+.08),h*.46),fill=(239,198,91,255))
    if mat=='storm_rune':
        d.line([(w*.6,h*.12),(w*.38,h*.48),(w*.6,h*.48),(w*.39,h*.87)],fill=(255,230,150,255),width=max(1,w//35))
    if mat=='rabbit_fur' and base_name=='body' and face in ('west','east'):
        # A sandy striped coat is central to this species' name.
        for j in range(3):
            xx=w*(.22+j*.21)
            d.line([(xx,h*.12),(xx+w*.07,h*.32),(xx+w*.02,h*.56)],fill=(141,105,72,255),width=max(2,w//26))
    if mat in ('statue_stone','statue_plate'):
        # Stone cracks and layered joints, rather than the generic fur strokes.
        d.line([(w*.18,h*.12),(w*.3,h*.32),(w*.25,h*.43),(w*.38,h*.65)],fill=(*tint(base,-29),255),width=max(1,w//90))
        d.line([(w*.65,h*.35),(w*.57,h*.52),(w*.7,h*.7)],fill=(*tint(base,-24),255),width=max(1,w//100))
    if mat=='statue_stone' and base_name=='head' and cube_index==0 and face in ('north','south'):
        for cx in (.3,.7):
            d.rectangle((w*(cx-.12),h*.35,w*(cx+.12),h*.52),fill=(70,45,40,255))
            d.rectangle((w*(cx-.08),h*.39,w*(cx+.08),h*.47),fill=(240,191,105,255))
    if mat in ('beetle_shell','beetle_plate') and face in ('up','west','east'):
        for j in range(1,4):
            xx=w*j/4;d.line([(xx,h*.12),(xx-w*.04,h*.5),(xx,h*.88)],fill=(*tint(base,-25),255),width=max(1,w//100))
    if mat=='bird_body' and face in ('west','east'):
        # Pale, staggered breast feathers instead of flat noise.
        for row in range(3):
            for col in range(4):
                xx=w*(.18+col*.17+(row%2)*.07);yy=h*(.28+row*.19)
                d.arc((xx,yy,xx+w*.1,yy+h*.12),15,155,fill=(158,188,181,255),width=max(1,w//100))
    if mat=='mouse_fur' and base_name=='body' and face in ('west','east'):
        for j in range(5):
            xx=w*(.15+j*.17);yy=h*(.25+(j%2)*.1)
            d.arc((xx,yy,xx+w*.12,yy+h*.15),20,160,fill=(168,146,110,255),width=max(1,w//90))
    if mat=='hunter_mane' and face in ('west','east'):
        d.line([(w*.15,h*.65),(w*.35,h*.35),(w*.52,h*.58),(w*.72,h*.25)],fill=(161,182,185,255),width=max(1,w//45))
    return im

def bake(name,prefix,design,render_surface=None,mer_for_mat=None):
    # Shared atlas baking only; the anatomy and materials remain explicitly
    # authored per species in the caller. Optional hooks keep material art and
    # channel values local to the calling creature set.
    render_surface=render_surface or surface
    mer_for_mat=mer_for_mat or (lambda mat:(0,0,190,255))
    bones=copy.deepcopy(design)
    for b in bones:
        b['name']=prefix+b['name']
        if 'parent' in b:b['parent']=prefix+b['parent']
    model={'description':{'identifier':f'geometry.hakkai.{name}','texture_width':SIZE,'texture_height':SIZE,'visible_bounds_width':3,'visible_bounds_height':3,'visible_bounds_offset':[0,1,0]},'bones':bones}
    density=next((d for d in range(18,5,-1) if fits(model,d)),None)
    if density is None:raise ValueError('UV atlas overflow '+name)
    atlas=Image.new('RGBA',(SIZE,SIZE),(0,0,0,0));mer=Image.new('RGBA',(SIZE,SIZE),(0,0,185,0));x=y=3;row=0
    for bone_ in bones:
        base_name=bone_['name'].removeprefix(prefix)
        for ci,cube in enumerate(bone_['cubes']):
            mat=cube.pop('material');uv={}
            for face,(a,b) in face_sizes(cube).items():
                w=max(5,round(a*density));h=max(5,round(b*density))
                if x+w+3>SIZE:x=3;y+=row;row=0
                if y+h+3>SIZE:raise ValueError('UV atlas overflow '+name)
                uv[face]={'uv':[x,y],'uv_size':[w,h]}
                paint=render_surface(mat,w,h,f'{name}/{base_name}/{ci}/{face}',face,base_name,ci)
                paste_with_gutter(atlas,paint,x,y);paste_with_gutter(mer,Image.new('RGBA',(w,h),mer_for_mat(mat)),x,y)
                x+=w+3;row=max(row,h+3)
            cube['uv']=uv
    gray=atlas.convert('RGB').convert('L').filter(ImageFilter.GaussianBlur(.7))
    nr=ImageChops.subtract(ImageChops.offset(gray,1,0),ImageChops.offset(gray,-1,0),scale=6,offset=128)
    ng=ImageChops.subtract(ImageChops.offset(gray,0,1),ImageChops.offset(gray,0,-1),scale=6,offset=128)
    normal=Image.merge('RGBA',(nr,ng,Image.new('L',(SIZE,SIZE),252),atlas.getchannel('A')))
    obj={'format_version':'1.12.0','minecraft:geometry':[model]}
    return {RP/f'models/entity/{name}.geo.json':(json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode(),RP/f'textures/entity/{name}.png':bytes_png(atlas),RP/f'textures/entity/{name}_mer.png':bytes_png(mer),RP/f'textures/entity/{name}_n.png':bytes_png(normal)}

def build(i):
    return bake(f'wild_1_{i}',f'w1_{i}_',DESIGNS[i]())

def main():
    p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');args=p.parse_args()
    if args.write==args.check:p.error('choose exactly one of --write or --check')
    for i in range(3):
        for path,data in build(i).items():
            if args.write:path.write_bytes(data)
            elif not path.exists() or path.read_bytes()!=data:raise SystemExit(f'Forest wildlife art stale: {path}')
    print('Three forest wildlife prototypes: 12 files '+('written' if args.write else 'verified'))
if __name__=='__main__':main()
