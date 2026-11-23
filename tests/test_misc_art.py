"""Verify icon coverage and vector regeneration. Requires Pillow."""
import json
from pathlib import Path
import sys
from PIL import Image
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'tools'))
from render_misc_icons import mapping, icon
from render_refined_misc import render_all
progress=json.loads((root/'texture_progress.json').read_text(encoding='utf8'))
misc=set(progress['provisional_misc_existing'])
refined=render_all()
assert set(refined)==set(progress['refined_misc_existing'])
assert (set(mapping()) | {f'drop_wild_{r}_{i}' for r in range(8) for i in range(2)}) - set(refined) == misc
for name,expected in refined.items():
 actual=Image.open(root/'Hakkai_v7.1.0/ResourcePack/textures/items'/f'hakkai_{name}.png').convert('RGBA')
 assert expected.tobytes()==actual.tobytes(),name
for name,(kind,attr) in mapping().items():
 if name not in misc: continue
 expected=icon(name,kind,attr)
 actual=Image.open(root/'Hakkai_v7.1.0/ResourcePack/textures/items'/f'hakkai_{name}.png').convert('RGBA')
 assert expected.tobytes()==actual.tobytes(),name
all_changed=progress['redrawn_existing']+progress['derived_existing']+progress['derived_extra_existing']+progress['refined_misc_existing']+progress['provisional_misc_existing']
items={f.stem for f in (root/'Hakkai_v7.1.0/BehaviorPack/items').glob('*.json')}
assert len(all_changed)==len(set(all_changed)) and set(all_changed)==items
print(f'{len(items)} item image files replaced; {len(misc)} provisional misc designs tracked (visual quality unverified)')
