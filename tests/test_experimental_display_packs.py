"""Static experiments only: no automatic detection or Bedrock client assertions."""
import hashlib,json,sys,tempfile,zipfile
from pathlib import Path
from PIL import Image
from fontTools.ttLib import TTFont
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import build_japanese_font_experiment as fb
font=ROOT/'experimental_packs/Hakkai_Japanese_Font_Test'
main=ROOT/'Hakkai_v7.1.0/ResourcePack'
assert hashlib.sha256(fb.SOURCE.read_bytes()).hexdigest()==fb.HASH
assert (font/'OFL.txt').read_bytes()==(ROOT/'art_sources/fonts/OFL.txt').read_bytes()
assert 'Copyright 2014-2021 Adobe' in (font/'NOTICE.txt').read_text(encoding='utf8')
fm=json.loads((font/'manifest.json').read_text());mm=json.loads((main/'manifest.json').read_text())
ids={fm['header']['uuid'],mm['header']['uuid'],fm['modules'][0]['uuid'],mm['modules'][0]['uuid']};assert len(ids)==4
pages={f'glyph_{n:02X}.png' for n in fb.PAGES};assert {p.name for p in (font/'font').iterdir()}==pages
assert all(n not in fb.PAGES for n in range(0xE0,0xF9))
assert not (font/'font/default8.png').exists() and not (font/'font/smooth').exists()
for path in (font/'font').glob('*.png'):
 with Image.open(path) as img:assert img.size==(512,512) and img.mode=='RGBA'
# All Japanese/Latin characters in overridden pages that appear in local pack
# strings are present in the source font. This is not a game renderer test.
chars=set()
for p in [*(main/'texts').glob('*.lang'),*(ROOT/'Hakkai_v7.1.0/BehaviorPack/scripts').glob('*.js')]:
 chars.update(ord(c) for c in p.read_text(encoding='utf8') if ord(c)>=128 and ord(c)//256 in fb.PAGES)
cmap=TTFont(fb.SOURCE).getBestCmap();assert chars<=cmap.keys()
# Verify each visible character used by the local add-on has pixels in the
# expected cell, not just an entry in the font's cmap. This still does not
# establish Bedrock's font selection, glyph metrics or visual correctness.
for page in fb.PAGES:
 used=[cp for cp in chars if cp>>8==page and not chr(cp).isspace()]
 if not used:continue
 with Image.open(font/'font'/f'glyph_{page:02X}.png') as img:
  alpha=img.getchannel('A')
  for cp in used:
   cell=cp&255;x=cell%16*32;y=cell//16*32
   assert alpha.crop((x,y,x+32,y+32)).getbbox(),hex(cp)
for char in '八界風記日本語剣霧炎参加':
 cp=ord(char);page=cp>>8;cell=cp&255
 with Image.open(font/'font'/f'glyph_{page:02X}.png') as img:
  x=cell%16*32;y=cell//16*32;assert img.getchannel('A').crop((x,y,x+32,y+32)).getbbox(),char
assert not (main/'font').exists()
from package_font_experiment import build
with tempfile.TemporaryDirectory() as td:
 a,b=Path(td)/'a.mcpack',Path(td)/'b.mcpack'
 assert build(a)==build(b)==len(pages)+3
 assert hashlib.sha256(a.read_bytes()).digest()==hashlib.sha256(b.read_bytes()).digest()
 with zipfile.ZipFile(a) as z:assert z.testzip() is None and 'manifest.json' in z.namelist()
 try:build(a);raise AssertionError('existing archive should not be overwritten')
 except FileExistsError:pass
print(f'Optional font experiment: {len(pages)} pages, {len(chars)} local glyphs covered; no real-client rendering verified')
