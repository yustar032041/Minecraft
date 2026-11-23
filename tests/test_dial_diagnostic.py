"""Structural checks, not evidence of Bedrock stack behavior or a fix."""
import io,json,sys,tempfile,zipfile
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from build_dial_diagnostic import build
source=json.loads((root/'Hakkai_v7.1.0/ResourcePack/textures/item_texture.json').read_text())['texture_data']
with tempfile.TemporaryDirectory() as d:
 a=Path(d)/'a.mcpack';b=Path(d)/'b.mcpack';assert build(a)==build(b)==len(source);assert a.read_bytes()==b.read_bytes()
 with zipfile.ZipFile(a) as z:
  assert z.testzip() is None
  atlas=json.loads(z.read('textures/item_texture.json'))['texture_data'];assert set(atlas)==set(source)
  assert all(k.startswith('hakkai_') for k in atlas)
  for key,entry in atlas.items():
   assert entry['textures']==f'textures/hakkai_dial_test/{key}'
   assert Image.open(io.BytesIO(z.read(entry['textures']+'.png'))).size==(32,32)
  assert not any('compass' in n or 'watch_atlas' in n or 'clock_item' in n for n in z.namelist())
print('Optional diagnostic pack: all custom icons only, 32px, deterministic (stack and rendering untested)')
