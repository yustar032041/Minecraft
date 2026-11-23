"""Static material/offset checks; cannot assess Minecraft rendering."""
import json
from pathlib import Path
from PIL import Image
rp=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack'
for leggings,chest in [(f'series_leggings_{i:02}',f'gear_{10+16*i:03}') for i in range(11)]+[('ult_leggings','ult_chest')]:
 d=json.loads((rp/'attachables'/f'{leggings}.json').read_text())['minecraft:attachable']['description']
 assert d['geometry']['default']=='geometry.hakkai.armor_leggings'
 assert 'offset' in d['scripts']['animate'] and d['animations']['offset']=='animation.armor.leggings.offset'
 for suffix in ('','_n','_mer'):
  leg=Image.open(rp/f'textures/hakkai/equipment/{leggings}{suffix}.png').convert('RGBA')
  base=Image.open(rp/f'textures/hakkai/equipment/{chest}{suffix}.png').convert('RGBA');assert leg.size==base.size
  sx,sy=leg.width//64,leg.height//32
  assert leg.crop((0,16*sy,16*sx,32*sy)).tobytes()==base.crop((40*sx,16*sy,56*sx,32*sy)).tobytes()
print('All 12 leggings have the matching chest material UVs, maps and player offset (static only)')
