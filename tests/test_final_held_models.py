"""Final tools use their item icons as held textures; render unverified."""
import json
from pathlib import Path
pack=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';rp=pack/'ResourcePack';bp=pack/'BehaviorPack'
atlas=json.loads((rp/'textures/item_texture.json').read_text())['texture_data']
for name in ('sword','axe','pickaxe'):
 ident='ult_'+name;assert not (rp/'attachables'/f'{ident}.json').exists()
 c=json.loads((bp/'items'/f'{ident}.json').read_text())['minecraft:item']['components'];assert c['minecraft:hand_equipped'] is True
 assert (rp/(atlas[c['minecraft:icon']]['textures']+'.png')).is_file()
print('Final tools use their icons without custom 3D attachables (static only)')
