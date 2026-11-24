#!/usr/bin/env python3
"""Build a deterministic 97x97 open-air factory village structure.
Requires nbtlib; run with PYTHONPATH=.cache/python if installed locally.
"""
from pathlib import Path
from nbtlib import File,Compound,List,Int,Byte,String
from array import array
SIZE=97; H=46; CENTER=48
palette=[];pal={}
def block(name,states=None):
 states=states or {};k=(name,tuple((key,str(value)) for key,value in sorted(states.items())))
 if k not in pal:
  pal[k]=len(palette);palette.append(Compound({'name':String(name),'states':Compound(states),'version':Int(18168865)}))
 return pal[k]
stone=block('minecraft:stone');dirt=block('minecraft:dirt');grass=block('minecraft:grass_block');path=block('minecraft:gravel');brick=block('minecraft:stone_bricks');wood=block('minecraft:oak_planks');log=block('minecraft:oak_log',{'pillar_axis':String('y')});glass=block('minecraft:glass');lantern=block('minecraft:lantern',{'hanging':Byte(0)});compost=block('minecraft:composter',{'composter_fill_level':Int(0)});barrel=block('minecraft:barrel',{'facing_direction':Int(0),'open_bit':Byte(0)});bell=block('hakkai:town_bell');crusher=block('hakkai:crusher',{'hakkai:spin':Int(0)});saw=block('hakkai:saw',{'hakkai:spin':Int(0)});rotor=block('hakkai:wind_rotor',{'hakkai:spin':Int(0)});bedFoot=block('minecraft:bed',{'direction':Int(0),'head_piece_bit':Byte(0),'occupied_bit':Byte(0)});bedHead=block('minecraft:bed',{'direction':Int(0),'head_piece_bit':Byte(1),'occupied_bit':Byte(0)})
# -1 leaves the (preflighted empty) world untouched. Floor is at world Y=87.
a=array('i',[-1])*(SIZE*H*SIZE)
def put(x,y,z,id):
 x+=CENTER;z+=CENTER
 if not (0<=x<SIZE and 0<=z<SIZE and 0<=y<H):raise ValueError((x,y,z))
 a[x*H*SIZE+y*SIZE+z]=id
for x in range(-48,49):
 for z in range(-48,49):
  for y in range(11,15):put(x,y,z,stone if y<13 else dirt)
  put(x,15,z,path if abs(x)<=2 or abs(z)<=2 or max(abs(x),abs(z))>=47 else grass)
# Twelve houses in a 4 by 3 layout, with doors, windows and 24 two-part beds.
for cx in [-36,-16,16,36]:
 for cz in [-30,0,30]:
  for x in range(cx-4,cx+5):
   for z in range(cz-4,cz+5):
    put(x,15,z,wood);put(x,20,z,wood)
    if abs(x-cx)==4 or abs(z-cz)==4:
     for y in range(16,20):
      if z==cz+4 and x==cx and y in (16,17):continue
      edge=(abs(x-cx)==4 and abs(z-cz)==4)
      put(x,y,z,log if edge else glass if y==18 and ((x-cx)%3==0 or (z-cz)%3==0) else wood)
  for dx in [-2,2]:put(cx+dx,16,cz-2,bedFoot);put(cx+dx,16,cz-1,bedHead)
  put(cx-2,16,cz+2,compost)
  # Paths meet the central grid without overwriting houses.
  for x in range(min(0,cx),max(0,cx)+1):
   if abs(x-cx)>4:put(x,15,cz+6,path)
  for z in range(min(0,cz+6),max(0,cz+6)+1):
   if abs(z-cz)>5:put(cx,15,z,path)
# Two irrigated public fields. Sources are enclosed by soil at water level;
# the lower stone/dirt layer provides a solid basin. Existing villages are not
# edited when the structure asset changes.
farmland=block('minecraft:farmland',{'moisturized_amount':Int(7)})
wheat=block('minecraft:wheat',{'growth':Int(7)})
water=block('minecraft:water',{'liquid_depth':Int(0)})
for x0 in (-12,6):
 for x in range(x0,x0+8):
  for z in range(12,23):
   put(x,15,z,farmland)
   if x%2==0 and z%2==0:put(x,16,z,wheat)
 for z in range(13,22):put(x0+3,15,z,water)
# Outdoor, unroofed working machines: input west, output east, rotors north/south.
put(0,16,0,bell)
for z,machine,rz in [(4,crusher,5),(-4,saw,-5)]:
 put(4,16,z,machine);put(3,16,z,barrel);put(5,16,z,barrel);put(4,16,rz,rotor)
for x,z in [(-6,-6),(-6,6),(8,-8),(8,8),(-12,-12),(-12,12),(12,-12),(12,12)]:put(x,16,z,lantern)
structure=Compound({'block_indices':List[List[Int]]([List[Int](a),List[Int]([-1])*len(a)]),'entities':List[Compound]([]),'palette':Compound({'default':Compound({'block_palette':List[Compound](palette),'block_position_data':Compound({})})})})
f=File({'format_version':Int(1),'size':List[Int]([SIZE,H,SIZE]),'structure':structure,'structure_world_origin':List[Int]([0,0,0])},byteorder='little')
out=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/BehaviorPack/structures/hakkai/site_59.mcstructure';f.save(out,byteorder='little');print('wrote',out,'bytes',out.stat().st_size,'palette',len(palette))
# Distinct second exploration site: a compact ruined storm observatory.
SIZE=45;CENTER=22;H=46;a=array('i',[-1])*(SIZE*H*SIZE)
palette=[];pal={}
stone=block('minecraft:stone');brick=block('minecraft:stone_bricks');path=block('minecraft:gravel');lantern=block('minecraft:lantern',{'hanging':Byte(0)})
slate=block('hakkai:copper_slate');thunder=block('hakkai:thunderstone');crystal=block('hakkai:storm_crystal')
for x in range(-22,23):
 for z in range(-22,23):
  for y in range(12,15):put(x,y,z,stone)
  put(x,15,z,slate if (abs(x)+abs(z))%5 else brick)
# A broad courtyard surrounding a hollow tower with an open gate.
for x in range(-15,16):
 for z in range(-15,16):
  if max(abs(x),abs(z))==15 and not (z==15 and abs(x)<=2):
   if (x+z)%7!=0:
    for y in range(16,18):put(x,y,z,brick)
for x in range(-5,6):
 for z in range(-5,6):
  if max(abs(x),abs(z))==5:
   for y in range(16,29):
    if z==5 and abs(x)<=1 and y<=18:continue
    if y in (21,22) and (x==0 or z==0):continue
    put(x,y,z,thunder if (x+z+y)%7==0 else brick)
  if max(abs(x),abs(z))<=5:put(x,29,z,slate)
for x,z in [(-4,-4),(-4,4),(4,-4),(4,4)]:
 for y in range(30,35):put(x,y,z,thunder)
 put(x,35,z,crystal)
put(0,30,0,crystal)
for z in range(6,23):put(0,15,z,path)
for x,z in [(-11,-11),(-11,11),(11,-11),(11,11)]:
 for y in range(16,20):put(x,y,z,brick)
 put(x,20,z,lantern)
structure=Compound({'block_indices':List[List[Int]]([List[Int](a),List[Int]([-1])*len(a)]),'entities':List[Compound]([]),'palette':Compound({'default':Compound({'block_palette':List[Compound](palette),'block_position_data':Compound({})})})})
f=File({'format_version':Int(1),'size':List[Int]([SIZE,H,SIZE]),'structure':structure,'structure_world_origin':List[Int]([0,0,0])},byteorder='little')
out=out.parent/'site_60.mcstructure';f.save(out,byteorder='little');print('wrote',out,'bytes',out.stat().st_size)
