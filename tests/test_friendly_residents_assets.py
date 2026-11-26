"""New worlds no longer ship the old separate resident IDs or assets."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=root/'BehaviorPack';rp=root/'ResourcePack'
for r in range(8):
 for i in range(4):
  ident=f'resident_{r}_{i}'
  assert not (bp/f'entities/{ident}.json').exists()
  assert not (rp/f'entity/{ident}.entity.json').exists()
  assert not (rp/f'textures/entity/{ident}.png').exists()
  for lang in ('ja_JP','en_US'):assert f'entity.hakkai:{ident}.name=' not in (rp/f'texts/{lang}.lang').read_text()
for i in range(4):assert not (rp/f'models/entity/resident_{i}.geo.json').exists()
print('32 obsolete resident entity IDs and independent models removed (static only)')
import re
for pack in (bp,rp):
 for path in pack.rglob('*'):
  if path.is_file() and path.suffix in ('.js','.json','.lang'):
   text=path.read_text(encoding='utf8')
   assert not re.search(r'hakkai:(?:resident_[0-7]_[0-3]|builder_[0-7])(?:[^0-9]|$)|hakkai_(?:resident|builder)',text),path
