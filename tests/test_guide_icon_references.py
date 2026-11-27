"""Check explicit guide form paths exist; actual device rendering is not tested."""
import re
from pathlib import Path
root=Path(__file__).resolve().parents[1];bp=root/'Hakkai_v7.1.0/BehaviorPack/scripts';rp=root/'Hakkai_v7.1.0/ResourcePack'
s=(bp/'main.js').read_text(encoding='utf8')
for item in set(re.findall(r"itemTexture\(['\"]([^'\"]+)['\"]\)",s)):
 assert (rp/'textures/items'/f'hakkai_{item}.png').exists(),item
for path in set(re.findall(r"['\"](textures/(?:ui|blocks)/hakkai_[a-z0-9_]+)['\"]",s)):
 assert (rp/(path+'.png')).exists(),path
assert "'textures/blocks/hakkai_assembler_0'" in s
print('Guide literal item/block/UI icon paths exist (static only)')
