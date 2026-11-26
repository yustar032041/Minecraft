"""Offline visibility checks; this is not Bedrock rendering validation."""
import sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from preview_mob_geometry import draw_face_depth,render

# The two faces occupy the same screen rectangle. Blue is nearer on the right,
# red on the left. Average-depth sorting cannot correctly draw both halves.
quad=[(10,10),(50,10),(50,50),(10,50)]
red=Image.new('RGBA',(4,4),(240,40,35,255));blue=Image.new('RGBA',(4,4),(30,90,235,255))
uv={'uv':[0,0],'uv_size':[4,4]}
def frame(order):
 canvas=Image.new('RGBA',(64,64),(0,0,0,255));depth=[float('-inf')]*(64*64)
 entries={'red':(red,[1,1,1,1]),'blue':(blue,[0,2,2,0])}
 for name in order:
  tex,z=entries[name];draw_face_depth(canvas,depth,quad,z,uv,tex)
 return canvas
first=frame(['red','blue']);second=frame(['blue','red'])
assert first.getpixel((20,30))[:3]==(240,40,35)
assert first.getpixel((40,30))[:3]==(30,90,235)
# Equal-depth pixels are deliberately undefined; non-ties must agree.
for y in range(11,50):
 for x in list(range(11,30))+list(range(31,50)):
  assert first.getpixel((x,y))==second.getpixel((x,y)),(x,y)
model={'bones':[{'name':'root','cubes':[{'origin':[0,0,0],'size':[2,2,2],'uv':{face:uv for face in ('north','south','east','west','up','down')}}]}]}
assert render(model,red,100,depth_buffer=True).size==(200,200)
# Exercise collection, culling, camera projection and the depth sign together.
# In the front view the lower-z cube is nearer. Reversing cube order must not
# alter the center pixel. This is still not an engine-coordinate validation.
texture=Image.new('RGBA',(8,4),(240,40,35,255));texture.paste((30,90,235,255),(4,0,8,4))
def cube(z,u):
 return {'origin':[-1,-1,z],'size':[2,2,1],'uv':{face:{'uv':[u,0],'uv_size':[4,4]} for face in ('north','south','east','west','up','down')}}
for cubes in ([cube(-2,0),cube(0,4)],[cube(0,4),cube(-2,0)]):
 image=render({'bones':[{'name':'root','cubes':cubes}]},texture,100,depth_buffer=True)
 assert image.getpixel((50,150))==(240,40,35)
try:render(model,Image.new('RGBA',(4,4),(255,255,255,127)),100,depth_buffer=True)
except ValueError:pass
else:raise AssertionError('alpha is not correctly sorted by this diagnostic')
print('Offline depth preview: per-pixel crossings, order independence, opaque-only guard')
