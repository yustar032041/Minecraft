"""Inspect actual NBT variants and protect their key functional landmarks."""
from pathlib import Path
import hashlib
from collections import Counter
import nbtlib
root=Path(__file__).resolve().parents[1]
folder=root/'Hakkai_v7.1.0/BehaviorPack/structures/hakkai'
hashes=[]
for v in range(4):
 path=folder/f'site_59_village_{v}.mcstructure';hashes.append(hashlib.sha256(path.read_bytes()).hexdigest())
 n=nbtlib.load(path,byteorder='little');assert list(map(int,n['size']))==[97,46,97]
 a=n['structure']['block_indices'][0];pal=n['structure']['palette']['default']['block_palette']
 names=[str(b['name']) for b in pal]
 def tile(x,y,z):
  q=int(a[(x+48)*46*97+y*97+z+48]);return names[q] if q>=0 else 'minecraft:air'
 counts=Counter(int(i) for i in a if int(i)>=0);byname=Counter()
 for i,c in counts.items():byname[names[i]]+=c
 assert byname['minecraft:bed']==48
 assert byname['hakkai:town_bell']==1 and tile(0,16,0)=='hakkai:town_bell'
 assert byname['hakkai:crusher']==byname['hakkai:saw']==1 and byname['hakkai:wind_rotor']==2
 assert byname['minecraft:farmland']>=140 and byname['minecraft:water']>=10
 # Raised grass, accessible skyline and preserved open builder plots.
 assert sum(tile(x,y,z)=='minecraft:grass_block' for x in range(-48,49) for z in range(-48,49) for y in range(16,21))>=200
 assert sum(tile(x,y,z) not in ('minecraft:air','minecraft:grass_block','minecraft:dirt') for x in range(-48,49,2) for z in range(-48,49,2) for y in range(22,37))>150
 allowed={'minecraft:grass_block','minecraft:dirt','minecraft:stone','minecraft:gravel'}
 plots=[]
 for x in range(-44,45,10):
  for z in range(-44,45,10):
   if all(tile(x+dx,15,z+dz) in allowed for dx in range(-3,4) for dz in range(-3,4)) and all(tile(x+dx,y,z+dz)=='minecraft:air' for dx in range(-4,5) for dz in range(-4,5) for y in range(16,22)):plots.append((x,z))
 assert len(plots)>=5,(v,len(plots))
assert len(set(hashes))==4
assert (folder/'site_59.mcstructure').read_bytes()==(folder/'site_59_village_0.mcstructure').read_bytes()
print('Four factory variants: distinct NBT, terrain, roofs, 24 beds, bell, machines, crops and builder plots OK (static)')
