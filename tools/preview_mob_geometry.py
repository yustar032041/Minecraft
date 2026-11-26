#!/usr/bin/env python3
"""Approximate, offline orthographic preview of Bedrock cuboid geometry.

This is a diagnostic, NOT a Bedrock renderer. It renders the rest pose only;
face orientation, Euler rotation conventions, transparent sorting, lighting,
normal/MER maps and animation are not engine-verified. The default painter
sort can misorder intersections; an opt-in opaque depth buffer is available
for programmatic use. Uses only Pillow, writes only to the explicit path.
"""
import argparse
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
RP = ROOT / 'Hakkai_v7.1.0/ResourcePack'


def matmul(a, b):
    return [[sum(a[r][k]*b[k][c] for k in range(4)) for c in range(4)] for r in range(4)]


def identity():
    return [[1.,0.,0.,0.],[0.,1.,0.,0.],[0.,0.,1.,0.],[0.,0.,0.,1.]]


def translate(p):
    m = identity()
    for i in range(3): m[i][3] = p[i]
    return m


def rotation(angles):
    # Static approximation. Coordinate and Euler ordering must be checked in Bedrock.
    x,y,z = [math.radians(v) for v in angles]
    cx,sx,cy,sy,cz,sz = math.cos(x),math.sin(x),math.cos(y),math.sin(y),math.cos(z),math.sin(z)
    rx = [[1,0,0,0],[0,cx,-sx,0],[0,sx,cx,0],[0,0,0,1]]
    ry = [[cy,0,sy,0],[0,1,0,0],[-sy,0,cy,0],[0,0,0,1]]
    rz = [[cz,-sz,0,0],[sz,cz,0,0],[0,0,1,0],[0,0,0,1]]
    return matmul(rz,matmul(ry,rx))


def around(pivot, angles):
    return matmul(translate(pivot),matmul(rotation(angles),translate([-v for v in pivot])))


def point(m, p):
    return tuple(sum(m[i][j]*p[j] for j in range(3))+m[i][3] for i in range(3))


def minus(a,b): return tuple(x-y for x,y in zip(a,b))
def dot(a,b): return sum(x*y for x,y in zip(a,b))
def cross(a,b): return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def norm(v):
    n = math.sqrt(dot(v,v))
    return tuple(x/n for x in v)


def faces(c):
    x,y,z = c['origin']; w,h,d = c['size']; inflate = c.get('inflate',0)
    x0,x1,y0,y1,z0,z1 = x-inflate,x+w+inflate,y-inflate,y+h+inflate,z-inflate,z+d+inflate
    # Four texture corners: top-left, top-right, bottom-right, bottom-left.
    return {
      'north': [(x1,y1,z0),(x0,y1,z0),(x0,y0,z0),(x1,y0,z0)],
      'south': [(x0,y1,z1),(x1,y1,z1),(x1,y0,z1),(x0,y0,z1)],
      'west': [(x0,y1,z0),(x0,y1,z1),(x0,y0,z1),(x0,y0,z0)],
      'east': [(x1,y1,z1),(x1,y1,z0),(x1,y0,z0),(x1,y0,z1)],
      'up': [(x0,y1,z0),(x1,y1,z0),(x1,y1,z1),(x0,y1,z1)],
      'down': [(x0,y0,z1),(x1,y0,z1),(x1,y0,z0),(x0,y0,z0)],
    }


def collect(model):
    bones = {b['name']:b for b in model['bones']}
    if len(bones) != len(model['bones']): raise ValueError('duplicate bone names')
    transforms = {}; pending = set()
    def transform(name):
        if name in transforms: return transforms[name]
        if name in pending: raise ValueError('cyclic bone hierarchy')
        if name not in bones: raise ValueError('missing parent bone: '+name)
        pending.add(name); b = bones[name]
        parent = transform(b['parent']) if b.get('parent') else identity()
        transforms[name] = matmul(parent,around(b.get('pivot',[0,0,0]),b.get('rotation',[0,0,0])))
        pending.remove(name)
        return transforms[name]
    result = []
    for bone in model['bones']:
        bm = transform(bone['name'])
        for cube in bone.get('cubes',[]):
            if not isinstance(cube.get('uv'),dict):
                raise ValueError('only per-face UVs are supported; box UV not supported')
            if cube.get('mirror') or bone.get('mirror'): raise ValueError('mirrored UV not supported')
            cm = matmul(bm,around(cube.get('pivot',[0,0,0]),cube.get('rotation',[0,0,0])))
            for name,quad in faces(cube).items():
                if name in cube['uv']:
                    result.append(([point(cm,p) for p in quad],cube['uv'][name]))
    if not result: raise ValueError('no drawable faces')
    return result


def draw_face(canvas, quad, uv, texture):
    # Projected cuboid faces are parallelograms, so an inverse affine transform
    # maps output pixels to texture pixels. Signed UV sizes preserve flips.
    u,v = uv['uv']; du,dv = uv.get('uv_size',[0,0])
    if not du or not dv: return
    a,b,_,d = quad; ax,ay = a; bx,by = b; dx,dy = d
    ex,ey,fx,fy = bx-ax,by-ay,dx-ax,dy-ay
    det = ex*fy-ey*fx
    if abs(det)<1e-7: return
    x0=max(0,math.floor(min(p[0] for p in quad))); y0=max(0,math.floor(min(p[1] for p in quad)))
    x1=min(canvas.width,math.ceil(max(p[0] for p in quad))+1); y1=min(canvas.height,math.ceil(max(p[1] for p in quad))+1)
    if x1<=x0 or y1<=y0: return
    # Source = (u,v) + inverse projected axes * (pixel - origin).
    A=du*fy/det; B=-du*fx/det; D=-dv*ey/det; E=dv*ex/det
    C=u+A*(x0-ax)+B*(y0-ay); F=v+D*(x0-ax)+E*(y0-ay)
    tile=texture.transform((x1-x0,y1-y0),Image.Transform.AFFINE,(A,B,C,D,E,F),resample=Image.Resampling.BILINEAR)
    mask=Image.new('L',tile.size,0); ImageDraw.Draw(mask).polygon([(p[0]-x0,p[1]-y0) for p in quad],fill=255)
    # Combine polygon coverage with texture alpha.
    from PIL import ImageChops
    tile.putalpha(ImageChops.multiply(mask,tile.getchannel('A')))
    canvas.alpha_composite(tile,(x0,y0))


def draw_face_depth(canvas, depth, quad, distances, uv, texture):
    """Rasterize one opaque orthographic face with a per-pixel depth buffer.

    This only improves visibility ordering of intersecting cuboids in an
    offline diagnostic. It is not an implementation of the Bedrock renderer.
    """
    u,v=uv['uv'];du,dv=uv.get('uv_size',[0,0])
    if not du or not dv:return
    a,b,_,d=quad;ax,ay=a;bx,by=b;dx,dy=d
    ex,ey,fx,fy=bx-ax,by-ay,dx-ax,dy-ay;det=ex*fy-ey*fx
    if abs(det)<1e-7:return
    x0=max(0,math.floor(min(p[0] for p in quad)));y0=max(0,math.floor(min(p[1] for p in quad)))
    x1=min(canvas.width,math.ceil(max(p[0] for p in quad))+1);y1=min(canvas.height,math.ceil(max(p[1] for p in quad))+1)
    if x1<=x0 or y1<=y0:return
    A=du*fy/det;B=-du*fx/det;D=-dv*ey/det;E=dv*ex/det
    C=u+A*(x0-ax)+B*(y0-ay);F=v+D*(x0-ax)+E*(y0-ay)
    tile=texture.transform((x1-x0,y1-y0),Image.Transform.AFFINE,(A,B,C,D,E,F),resample=Image.Resampling.BILINEAR).convert('RGBA')
    mask=Image.new('1',tile.size,0);ImageDraw.Draw(mask).polygon([(p[0]-x0,p[1]-y0) for p in quad],fill=1)
    samples=tile.load();coverage=mask.load();dest=canvas.load();width=canvas.width
    za,zb,_,zd=distances
    # z(x,y) is affine on an orthographically projected cuboid face.
    zx=((zb-za)*fy-(zd-za)*ey)/det
    zy=(-(zb-za)*fx+(zd-za)*ex)/det
    for yy in range(y1-y0):
        zrow=za+zx*(x0-ax)+zy*(y0+yy-ay);row=(y0+yy)*width+x0
        for xx in range(x1-x0):
            if not coverage[xx,yy]:continue
            color=samples[xx,yy]
            if color[3]==0:continue
            z=zrow+zx*xx
            if z>depth[row+xx]:
                depth[row+xx]=z;dest[x0+xx,y0+yy]=(*color[:3],255)

def render(model, texture, panel=480, framing=None, depth_buffer=False):
    # Optional shared vertices let related growth stages use the same frame.
    # The default remains the bounds of the model being rendered.
    if depth_buffer and texture.convert('RGBA').getchannel('A').getextrema()!=(255,255):
        raise ValueError('depth preview is limited to opaque source textures')
    geometry=collect(model)
    views=[('front 3/4',(-1.4,1.0,-2.4)),('back 3/4',(1.4,1.0,2.4)),('front',(0,0,-1)),('side',(1,0,0))]
    output=Image.new('RGBA',(panel*2,panel*2),(24,27,31,255))
    for i,(label,direction) in enumerate(views):
        forward=norm(direction); right=norm(cross((0,1,0),forward)); up=norm(cross(forward,right))
        vertices=framing if framing is not None else [p for quad,_ in geometry for p in quad]
        if not vertices: raise ValueError('empty framing vertices')
        xy=[(dot(p,right),dot(p,up)) for p in vertices]
        lo_x=min(x for x,y in xy);hi_x=max(x for x,y in xy);lo_y=min(y for x,y in xy);hi_y=max(y for x,y in xy)
        extent=max(hi_x-lo_x,hi_y-lo_y,1);scale=(panel-60)/extent
        cx=(lo_x+hi_x)/2;cy=(lo_y+hi_y)/2
        canvas=Image.new('RGBA',(panel,panel),(32,36,42,255)); projected=[]
        for quad,uv in geometry:
            normal=cross(minus(quad[1],quad[0]),minus(quad[3],quad[0]))
            # Vertex order points inward. Cull away faces looking away from camera.
            if dot(normal,forward)>=-1e-8: continue
            points=[(panel/2+(dot(p,right)-cx)*scale,panel/2-(dot(p,up)-cy)*scale) for p in quad]
            distances=[dot(p,forward) for p in quad]
            projected.append((sum(distances)/4,points,uv,distances))
        if depth_buffer:
            depth=[float('-inf')]*(panel*panel)
            for _,quad,uv,distances in projected:draw_face_depth(canvas,depth,quad,distances,uv,texture)
        else:
            for _,quad,uv,_ in sorted(projected,key=lambda item:item[0]):draw_face(canvas,quad,uv,texture)
        draw=ImageDraw.Draw(canvas);draw.text((12,10),label,fill=(230,230,230,255))
        output.alpha_composite(canvas,((i%2)*panel,(i//2)*panel))
    return output.convert('RGB')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('geometry',type=Path,help='geometry JSON with one minecraft:geometry entry')
    parser.add_argument('texture',type=Path,help='color PNG corresponding to the geometry')
    parser.add_argument('--output',required=True,type=Path,help='explicit output PNG outside the resource pack')
    parser.add_argument('--panel',type=int,default=480)
    args=parser.parse_args()
    if args.panel<100 or args.panel>1600: parser.error('panel must be between 100 and 1600')
    if args.output.suffix.lower()!='.png': parser.error('output must be a PNG')
    if args.output.resolve().is_relative_to(RP.resolve()): parser.error('output must not be inside the resource pack')
    data=json.loads(args.geometry.read_text(encoding='utf8'));models=data['minecraft:geometry']
    if len(models)!=1: parser.error('expected exactly one geometry entry')
    texture=Image.open(args.texture).convert('RGBA')
    desc=models[0]['description']
    if texture.size!=(desc['texture_width'],desc['texture_height']):
        parser.error('texture dimensions do not match the geometry UV dimensions')
    image=render(models[0],texture,args.panel)
    args.output.parent.mkdir(parents=True,exist_ok=True);image.save(args.output)
    print('Approximate rest-pose diagnostic (not Bedrock):',args.output)

if __name__=='__main__': main()
