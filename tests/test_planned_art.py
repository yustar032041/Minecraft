"""Reproducibility of art-only travel assets (not game functionality)."""
import json
from pathlib import Path
import sys
from PIL import Image
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'tools'))
from render_planned_travel_icons import render_all as travel_art
from render_planned_extras import render_all as extra_art
progress=json.loads((root/'texture_progress.json').read_text(encoding='utf8'))
travel=travel_art();extras=extra_art()
assert len(travel)==16 and len(extras)==12 and not set(travel)&set(extras)
images={**travel,**extras}
assert set(images).issubset(set(progress['planned_art_only']) | set(progress['derived_extra_existing']))
for name,expected in images.items():
 actual=Image.open(root/'Hakkai_v7.1.0/ResourcePack/textures/items'/f'hakkai_{name}.png').convert('RGBA')
 assert expected.tobytes()==actual.tobytes(),name
 assert (root/'Hakkai_v7.1.0/BehaviorPack/items'/f'{name}.json').exists() == (name in {'warden_core','magic_hikari','magic_kaze','magic_mizu','magic_homura','magic_kizuna','ult_helmet','ult_chest','ult_boots','ult_sword','ult_axe'})
print('28 travel and extra item textures match their templates; warden core, five magic items and three final armor icons and two final weapons are implemented')
