"""Builder links and pre-existing structure plot checks, not in-game tests."""
import json
from pathlib import Path
import nbtlib
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=root/'BehaviorPack';rp=root/'ResourcePack'
read=lambda p:json.loads(p.read_text(encoding='utf8'))
for r in range(8):
 id=f'builder_{r}'
 assert not (bp/f'entities/{id}.json').exists()
 assert not (rp/f'entity/{id}.entity.json').exists()
 assert not (rp/f'textures/entity/{id}.png').exists()
 assert f'entity.hakkai:{id}.name=' not in (rp/'texts/ja_JP.lang').read_text(encoding='utf8')
# The actual published structures have at least five mutually separate, clear,
# 7x7 plots with a one-block air buffer and a solid-looking existing floor.
allowed={'minecraft:grass_block','minecraft:dirt','minecraft:stone','minecraft:gravel','minecraft:moss_block','minecraft:sandstone','minecraft:snow_block','minecraft:tuff','minecraft:deepslate','hakkai:cloudstone','hakkai:clockstone'}
for id in [59,*range(61,69)]:
 n=nbtlib.load(bp/f'structures/hakkai/site_{id}.mcstructure',byteorder='little');size,height,_=map(int,n['size'])
 palette=n['structure']['palette']['default']['block_palette'];indices=n['structure']['block_indices'][0];half=size//2;limit=half-4
 def block(x,y,z):
  v=int(indices[(x+half)*height*size+y*size+z+half]);return 'minecraft:air' if v<0 else str(palette[v]['name'])
 plots=[]
 for x in range(-limit,limit+1,10):
  for z in range(-limit,limit+1,10):
   if all(block(x+a,15,z+b) in allowed for a in range(-3,4) for b in range(-3,4)) and all(block(x+a,y,z+b)=='minecraft:air' for a in range(-4,5) for b in range(-4,5) for y in range(16,22)):
    plots.append((x,z))
 assert len(plots)>=5,(id,len(plots))
print('Old builder assets removed and at least five bounded clear plot candidates per source structure (static)')
