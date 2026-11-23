"""Detect direct overrides only; this cannot validate the engine's atlas rendering."""
import json
from pathlib import Path
rp=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack'
atlas=json.loads((rp/'textures/item_texture.json').read_text())['texture_data']
for key in ('clock_item','compass_item','lodestonecompass_item','recovery_compass'):
    assert key not in atlas, f'vanilla atlas key overridden: {key}'
for name in ('clock_item','compass_item','lodestonecompass_item','recovery_compass_item','watch_atlas','compass_atlas','lodestonecompass_atlas','recovery_compass_atlas'):
    assert not list((rp/'textures/items').glob(name+'.*')), f'vanilla texture overridden: {name}'
for name in ('clock','compass','recovery_compass','lodestone_compass'):
    assert not (rp/'attachables'/f'{name}.json').exists()
print('No direct clock/compass texture, atlas key or attachable overrides (engine rendering not tested)')
