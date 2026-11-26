"""All 20 independent material illustrations match their sources and preview."""
import json,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from render_mob_drop_elements import render,inventory_preview,SOURCES,ITEMS
progress=json.loads((root/'texture_progress.json').read_text(encoding='utf8'))
sources=sorted(SOURCES.glob('*.png'))
assert all(p.stem.isdigit() and 0<=int(p.stem)<20 for p in sources)
finished={int(p.stem) for p in sources}
assert finished==set(range(20))
assert len({p.read_bytes() for p in sources})==len(sources)
for source in sources:
 name='drop_element_'+source.stem
 assert name in progress['redrawn_existing']
 expected=render(source);actual=Image.open(ITEMS/f'hakkai_{name}.png').convert('RGBA')
 assert expected.size==(512,512) and expected.tobytes()==actual.tobytes(),name
 assert expected.getchannel('A').getextrema()==(0,255)
 for suffix in ('_normal','_mer'):
  m=Image.open(ITEMS/f'hakkai_{name}{suffix}.png').convert('RGBA')
  assert m.size==actual.size and m.getchannel('A').tobytes()==actual.getchannel('A').tobytes()
preview=Image.open(root/'art_sources/mob_drop_previews/inventory_32px.png').convert('RGB')
assert preview.tobytes()==inventory_preview().tobytes()
print(f'{len(finished)} independent 512px material illustrations and 32px audit preview reproducible')
