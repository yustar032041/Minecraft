"""Reproducibility of art-only travel assets (not game functionality)."""
import json
from pathlib import Path
import sys
from PIL import Image
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'tools'))
from render_planned_extras import render_all as extra_art
progress=json.loads((root/'texture_progress.json').read_text(encoding='utf8'))
images=extra_art()
assert len(images)==7
assert set(images).issubset(set(progress['planned_art_only']) | set(progress['derived_extra_existing']))
for name,expected in images.items():
 actual=Image.open(root/'Hakkai_v7.1.0/ResourcePack/textures/items'/f'hakkai_{name}.png').convert('RGBA')
 assert expected.tobytes()==actual.tobytes(),name
 assert (root/'Hakkai_v7.1.0/BehaviorPack/items'/f'{name}.json').exists() == (name in {'warden_core','ult_helmet','ult_chest','ult_boots','ult_sword','ult_axe'})
print('7 extra item textures match their templates; warden core, three final armor icons and two final weapons are implemented')
