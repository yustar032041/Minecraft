"""Checks original art and strip structure, not actual Minecraft rendering."""
import io,json,sys,tempfile,zipfile
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from build_dial_replacement import build
with tempfile.TemporaryDirectory() as d:
 a=Path(d)/'a.mcpack';b=Path(d)/'b.mcpack';assert build(a)==build(b)==9;assert a.read_bytes()==b.read_bytes()
 with zipfile.ZipFile(a) as z:
  assert z.testzip() is None;assert json.loads(z.read('manifest.json'))['header']['version']==[1,0,0]
  for name,count in [('compass_atlas',32),('lodestonecompass_atlas',32),('recovery_compass_atlas',32),('watch_atlas',64)]:
   im=Image.open(io.BytesIO(z.read(f'textures/items/{name}.png'))).convert('RGBA');assert im.size==(16,count*16)
   frames=[im.crop((0,i*16,16,(i+1)*16)).tobytes() for i in range(count)]
   assert len(set(frames))>=16,name
   assert im.getpixel((0,0))[3]==0
  for name in ('clock_item','compass_item','lodestonecompass_item','recovery_compass_item'):
   assert Image.open(io.BytesIO(z.read(f'textures/items/{name}.png'))).size==(16,16)
print('Experimental dial overlay: 32/64 frame strips and static icons, deterministic; in-game calibration unverified')
