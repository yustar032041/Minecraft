#!/usr/bin/env python3
"""Deterministic eight 65×65 realm heritage sites. Optional nbtlib required."""
from array import array
from pathlib import Path
from nbtlib import File, Compound, List, Int, Byte, String
SIZE,H,C=65,46,32
OUT=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/BehaviorPack/structures/hakkai'
THEMES=[
 ('minecraft:grass_block','minecraft:dirt','hakkai:windworn_sandstone','minecraft:oak_planks','hakkai:sky_crystal'),
 ('minecraft:moss_block','minecraft:rooted_dirt','minecraft:oak_log','minecraft:oak_planks','hakkai:glow_moss'),
 ('minecraft:sandstone','minecraft:sandstone','hakkai:red_dune_stone','hakkai:windworn_sandstone','minecraft:bone_block'),
 ('minecraft:snow_block','minecraft:packed_ice','hakkai:frost_stone','minecraft:packed_ice','hakkai:frost_crystal'),
 ('minecraft:tuff','minecraft:stone','hakkai:thunderstone','minecraft:cut_copper','hakkai:storm_crystal'),
 ('minecraft:deepslate','minecraft:deepslate','hakkai:abyssal_stone','hakkai:moonstone','hakkai:glow_moss'),
 ('hakkai:cloudstone','hakkai:cloudstone','hakkai:aether_stone','minecraft:quartz_block','hakkai:sky_crystal'),
 ('hakkai:clockstone','minecraft:stone','hakkai:clockstone','hakkai:brasswork','hakkai:timeglass')
]
for r,(top,under,primary,secondary,accent) in enumerate(THEMES):
 palette=[];lookup={}
 def block(name,states=None):
  states=states or {};k=(name,tuple((k,str(v)) for k,v in sorted(states.items())))
  if k not in lookup:
   lookup[k]=len(palette);palette.append(Compound({'name':String(name),'states':Compound(states),'version':Int(18168865)}))
  return lookup[k]
 def bid(name):
  return block(name,{'pillar_axis':String('y')} if name=='minecraft:oak_log' else {})
 T,U,P,S,A=map(bid,(top,under,primary,secondary,accent))
 chronicle=block('hakkai:chronicle');barrel=block('minecraft:barrel',{'facing_direction':Int(0),'open_bit':Byte(0)})
 lantern=block('minecraft:lantern',{'hanging':Byte(0)});books=block('minecraft:bookshelf')
 a=array('i',[-1])*(SIZE*H*SIZE)
 def put(x,y,z,b):
  X=x+C;Z=z+C
  if not (0<=X<SIZE and 0<=Z<SIZE and 0<=y<H):raise ValueError((r,x,y,z))
  a[X*H*SIZE+y*SIZE+Z]=b
 def col(x,z,y0,y1,b):
  for y in range(y0,y1+1):put(x,y,z,b)
 def rect(x0,x1,z0,z1,y,b):
  for x in range(x0,x1+1):
   for z in range(z0,z1+1):put(x,y,z,b)
 def ring(radius,y,b):
  for x in range(-radius-1,radius+2):
   for z in range(-radius-1,radius+2):
    if abs((x*x+z*z)**.5-radius)<.65:put(x,y,z,b)
 # 4-block base; sky uses a round island instead of an invisible square.
 for x in range(-32,33):
  for z in range(-32,33):
   if r==6 and x*x+z*z>31*31:continue
   for y in range(12,15):put(x,y,z,U)
   put(x,15,z,T)
 # Broad approachable paths and a marked centre kept clear for spawn safety.
 rect(-2,2,-31,31,15,S);rect(-31,31,-2,2,15,S)
 for x,z in [(-20,-20),(-20,20),(20,-20),(20,20)]:
  for y in range(16,19):put(x,y,z,P)
  put(x,19,z,lantern)
 if r==0: # public windmill and farm courtyard
  for x in range(-7,8):
   for z in range(-19,-4):
    if abs(x)==7 or z in (-19,-5):
     for y in range(16,27):
      if z==-5 and abs(x)<=1 and y<=18:continue
      put(x,y,z,P)
  rect(-7,7,-19,-5,27,S)
  # Fixed, non-moving vanes on the front wall.
  col(0,-4,28,34,P)
  for i in range(-6,7):put(i,32,-4,S);put(0,32+i,-4,S)
  put(0,32,-4,A)
  for x in range(-25,-11):
   for z in range(8,22):put(x,15,z,block('minecraft:farmland',{'moisturized_amount':Int(7)}))
  for x in [-24,-18,-12]:
   for z in range(9,21):put(x,15,z,block('minecraft:water',{'liquid_depth':Int(0)}))
  for x in range(-25,-11,2):
   for z in range(8,22,2):put(x,16,z,block('minecraft:wheat',{'growth':Int(7)}))
 elif r==1: # root hall and books beneath a solid canopy
  for x,z in [(-11,-11),(-11,2),(11,-11),(11,2)]:
   for dx in (0,1):
    for dz in (0,1):col(x+dx,z+dz,16,29,P)
  for x in range(-11,13):
   for z in range(-12,4):
    if (x/13)**2+((z+4)/10)**2<=1:put(x,30,z,block('minecraft:moss_block'))
  for x in range(-8,9,4):
   for y in range(16,20):put(x,y,-9,books)
  for x,z in [(-7,-5),(7,-5),(-7,0),(7,0)]:put(x,16,z,lantern)
  for i in range(10):put(-11-i//2,16+i//2,-11-i//2,P);put(11+i//2,16+i//2,2+i//2,P)
 elif r==2: # winding, roofless sandstone maze with intentional gaps
  for x in [-18,-10,-2,6,14,22]:
   for z in range(-23,5):
    if (x in [-18,-2,14] and -12<=z<=-9) or (x in [-10,6,22] and -21<=z<=-18):continue
    col(x,z,16,20,P)
  for z in [-23,4]:
   for x in range(-18,23):
    if abs(x)<=2 and z==4:continue
    col(x,z,16,20,S)
  for x in [-18,22]:col(x,-23,21,24,A)
 elif r==3: # frozen lake: bottom and two-deep sources completely enclosed
  water=block('minecraft:water',{'liquid_depth':Int(0)});ice=block('minecraft:packed_ice')
  # two-block thick rim around a 27×17 basin, independent of chunk edges
  for x in range(-15,16):
   for z in range(-24,-3):
    border=abs(x)>=14 or z in (-24,-23,-5,-4)
    put(x,14,z,U)
    if border:put(x,15,z,P);put(x,16,z,P)
    else:put(x,15,z,water);put(x,16,z,ice if (x+2*z)%5 else water)
  # accessible lakeside pavilion; no fluids reach the path or other chunks
  for x,z in [(-9,6),(-9,22),(9,6),(9,22)]:col(x,z,16,25,P)
  for x in range(-9,10):
   for z in range(6,23):
    if abs(x)==9 or z in (6,22) or (abs(x)<=3 and abs(z-14)<=3):put(x,26,z,S)
  for x in range(-5,6):put(x,27,14,A)
 elif r==4: # copper smithy around an open central courtyard
  for x,z in [(-12,-16),(-12,4),(12,-16),(12,4)]:col(x,z,16,28,P)
  for x in range(-12,13):
   for z in range(-16,5):
    if abs(x)==12 or z in (-16,4):put(x,29,z,S)
  for x in range(-9,10,3):col(x,-13,16,18,P);put(x,19,-13,A)
  for x in [-5,0,5]:put(x,16,-8,block('minecraft:blast_furnace',{'minecraft:cardinal_direction':String('south')}))
  for x in [-3,3]:col(x,1,16,24,S);put(x,25,1,A)
 elif r==5: # luminous underground garden with an open, high canopy
  for x,z in [(-17,-17),(-17,5),(17,-17),(17,5)]:col(x,z,16,29,P)
  for x in range(-17,18):
   for z in range(-17,6):
    if (x*x+(z+6)*(z+6))<=250 and (x+z)%3:put(x,30,z,P)
  for x,z,h in [(-10,-10,8),(0,-13,10),(10,-8,7),(-11,0,6),(11,0,9)]:
   col(x,z,16,15+h,P)
   for dx in range(-3,4):
    for dz in range(-3,4):
     if dx*dx+dz*dz<=10:put(x+dx,16+h,z+dz,A)
  for x,z in [(-5,-6),(5,-6),(0,-1)]:col(x,z,16,19,S);put(x,20,z,A)
 elif r==6: # sky-island underside and open observation terraces
  for x in range(-28,29):
   for z in range(-28,29):
    dist=(x*x+z*z)**.5
    if dist<27:
     depth=max(1,int((27-dist)/5)+1)
     for y in range(12-depth,12):put(x,y,z,U)
  for x,z in [(-12,-14),(-12,4),(12,-14),(12,4)]:col(x,z,16,28,P);put(x,29,z,A)
  for x in range(-12,13):put(x,27,-14,S);put(x,27,4,S)
  for z in range(-14,5):put(-12,27,z,S);put(12,27,z,S)
  for dx,dz in [(-19,0),(19,0),(0,-19),(0,19)]:col(dx,dz,16,23,P);put(dx,24,dz,A)
 elif r==7: # time station, open platforms and a fixed clock
  for x,z in [(-16,-16),(-16,5),(16,-16),(16,5)]:col(x,z,16,29,P)
  for x in range(-16,17):
   for z in range(-16,6):
    if abs(x)==16 or z in (-16,5) or abs(x)<3:put(x,30,z,S)
  for x in range(-6,7):
   for y in range(20,33):
    if abs(((x*x+(y-26)*(y-26))**.5)-6)<.7:put(x,y,-15,S)
  col(0,-15,23,27,A)
  for x in range(1,5):put(x,26,-15,A)
  for z in range(-14,4,4):put(-10,16,z,block('minecraft:oak_planks'));put(10,16,z,block('minecraft:oak_planks'))
 # Existing read handler expects this precise location; barrel has real loot.
 put(2,16,11,chronicle);put(3,16,13,barrel)
 structure=Compound({'block_indices':List[List[Int]]([List[Int](a),List[Int]([-1])*len(a)]),'entities':List[Compound]([]),'palette':Compound({'default':Compound({'block_palette':List[Compound](palette),'block_position_data':Compound({})})})})
 file=File({'format_version':Int(1),'size':List[Int]([SIZE,H,SIZE]),'structure':structure,'structure_world_origin':List[Int]([0,0,0])},byteorder='little')
 out=OUT/f'site_{61+r}.mcstructure';file.save(out,byteorder='little');print(out.name,out.stat().st_size,'palette',len(palette))
