"""Use the item icon as the held appearance, not a custom 3D attachable.
Static asset coverage only: Bedrock must still verify the actual held rendering.
"""
import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';rp=root/'ResourcePack';bp=root/'BehaviorPack'
catalog=json.loads(re.search(r'export const catalog=(\[.*?\]);',(bp/'scripts/data.js').read_text()).group(1))
weapons=[x for x in catalog if x['kind'] in {'剣','斧','弓','杖','ハンマー','槍','盾','扇'}];assert len(weapons)==95
atlas=json.loads((rp/'textures/item_texture.json').read_text())['texture_data']
for item in weapons:
 name=item['id'];assert not (rp/'attachables'/f'{name}.json').exists(), name
 components=json.loads((bp/'items'/f'{name}.json').read_text())['minecraft:item']['components']
 icon=components['minecraft:icon'];assert (rp/(atlas[icon]['textures']+'.png')).is_file(), name
 assert components['minecraft:hand_equipped'] is True
print('95 weapon items use their existing icon without a custom 3D attachable (static only)')
