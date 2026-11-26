"""Leggings use their own icons and retain offsets, not copied chest UVs."""
import json,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from build_icon_matched_armor import wearable_items,render_texture
rp=root/'Hakkai_v7.1.0/ResourcePack';items={name:(part,icon) for name,part,icon in wearable_items()}
for leggings in [f'series_leggings_{i:02}' for i in range(11)]+['ult_leggings']:
 part,icon=items[leggings];assert part=='leggings'
 d=json.loads((rp/'attachables'/f'{leggings}.json').read_text())['minecraft:attachable']['description']
 assert d['geometry']['default']=='geometry.hakkai.icon_armor_leggings'
 assert 'offset' in d['scripts']['animate'] and d['animations']['offset']=='animation.armor.leggings.offset'
 leg=Image.open(rp/f'textures/hakkai/equipment/{leggings}.png').convert('RGBA')
 assert leg.tobytes()==render_texture(icon,part,leg.width).tobytes()
print('All 12 leggings retain offsets and are built from their own icons (static only)')
