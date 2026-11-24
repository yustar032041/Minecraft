#!/usr/bin/env python3
"""Rebuild four deterministic, bounded 97x97 factory-village structures.

Requires nbtlib. Start from the reproducible original, preserving its bell,
24 beds, crops and functional machinery. Add distinctive roofs, terraced
hills and a windmill/tower while leaving old-world structures untouched.
"""
from pathlib import Path
from copy import deepcopy
from math import hypot
from nbtlib import load, Int, String, Compound
import subprocess, sys

root=Path(__file__).resolve().parents[1]
subprocess.run([sys.executable,str(root/'tools/build_factory_village.py')],check=True)
out=root/'Hakkai_v7.1.0/BehaviorPack/structures/hakkai'
base=load(out/'site_59.mcstructure',byteorder='little')
# Separate distinct arrangement, skyline and local elevations, not just colors.
layouts=[
 ([(-25,-15),(25,15),(-30,15),(25,-30),(-10,-40),(30,-40)],(-40,-40),0),
 ([(-25,15),(25,-15),(-30,-15),(25,30),(-30,-40),(10,-40)],(40,-40),1),
 ([(-30,-10),(25,25),(30,-15),(-25,25),(-10,-40),(40,-40)],(-25,-30),2),
 ([(-25,-30),(25,30),(-25,15),(30,15),(-10,-40),(-40,-40)],(25,-15),3),
]
for variant,(hills,landmark,style) in enumerate(layouts):
 n=deepcopy(base);a=n['structure']['block_indices'][0];p=n['structure']['palette']['default']['block_palette']
 def index(x,y,z):
  assert -48<=x<=48 and -48<=z<=48 and 0<=y<46,(x,y,z)
  return (x+48)*46*97+y*97+z+48
 def name(x,y,z):
  q=int(a[index(x,y,z)]);return str(p[q]['name']) if q>=0 else 'minecraft:air'
 def block(id):
  for i,b in enumerate(p):
   if str(b['name'])==id and len(b['states'])==0:return i
  p.append(Compound({'name':String(id),'states':Compound({}),'version':Int(18168865)}));return len(p)-1
 def put(x,y,z,id):a[index(x,y,z)]=Int(block(id))
 # Original oak homes keep their entryways and beds. Layered gabled roofs,
 # chimneys and roof lights vary across both neighborhood and village style.
 roofs=['minecraft:spruce_planks','minecraft:dark_oak_planks','minecraft:stone_bricks','minecraft:birch_planks']
 for ix,cx in enumerate([-36,-16,16,36]):
  for iz,cz in enumerate([-30,0,30]):
   material=roofs[(ix+iz+style)%4]
   for dx in range(-4,5):
    # Alternating long/short gables make a nonuniform skyline.
    rise=(4-abs(dx))//(2 if (ix+iz+style)%2 else 1)
    for dz in range(-4,5):put(cx+dx,21+rise,cz+dz,material)
   for y in range(22,27):put(cx-3,y,cz-3,'minecraft:cobblestone')
   put(cx-3,27,cz-3,'minecraft:lantern')
 # Raised, stepped earthen mounds with grass tops. Change the topography, not
 # the floor inside houses, roads, farms or the central town bell.
 for hx,hz in hills:
  for dx in range(-5,6):
   for dz in range(-5,6):
    distance=hypot(dx,dz);height=max(0,5-int(distance))
    x,z=hx+dx,hz+dz
    if not height or name(x,15,z)!='minecraft:grass_block' or any(name(x,y,z)!='minecraft:air' for y in range(16,21)):continue
    for y in range(16,16+height):put(x,y,z,'minecraft:grass_block' if y==15+height else 'minecraft:dirt')
 # A walk-in landmark distinct for every layout: tall mill, watchtower,
 # timber mill or stone watchtower. No existing occupied volume is replaced.
 x0,z0=landmark
 assert all(name(x0+dx,15,z0+dz)=='minecraft:grass_block' and all(name(x0+dx,y,z0+dz)=='minecraft:air' for y in range(16,37)) for dx in range(-3,4) for dz in range(-3,4)),(variant,landmark)
 wall=['minecraft:spruce_planks','minecraft:stone_bricks','minecraft:oak_planks','minecraft:cobblestone'][variant]
 trim=['minecraft:oak_log','minecraft:oak_planks','minecraft:oak_log','minecraft:stone_bricks'][variant]
 for dx in range(-3,4):
  for dz in range(-3,4):
   put(x0+dx,15,z0+dz,'minecraft:oak_planks')
   if abs(dx)==3 or abs(dz)==3:
    for y in range(16,30):
     if dz==3 and dx==0 and y<=18:continue
     if y in (20,21,25,26) and (dx==0 or dz==0):put(x0+dx,y,z0+dz,'minecraft:glass')
     else:put(x0+dx,y,z0+dz,trim if abs(dx)==3 and abs(dz)==3 else wall)
   put(x0+dx,30,z0+dz,wall)
 for dx,dz in [(-3,-3),(-3,3),(3,-3),(3,3)]:put(x0+dx,31,z0+dz,'minecraft:lantern')
 if variant%2==0:
  # Static timber sails (decorative; mechanical wind rotors remain by machines).
  for step in range(-6,7):
   put(x0+step,27,z0-4,'minecraft:birch_planks')
   put(x0,27+step,z0-4,'minecraft:birch_planks')
  put(x0,27,z0-4,'minecraft:gold_block')
 else:
  # Open observation crown with four tall corner pillars.
  for dx,dz in [(-3,-3),(-3,3),(3,-3),(3,3)]:
   for y in range(32,36):put(x0+dx,y,z0+dz,trim)
  for dx in range(-3,4):
   for dz in range(-3,4):put(x0+dx,36,z0+dz,wall)
 target=out/f'site_59_village_{variant}.mcstructure';n.save(target,byteorder='little')
 if variant==0:n.save(out/'site_59.mcstructure',byteorder='little')
 print('generated',target.name,target.stat().st_size)
