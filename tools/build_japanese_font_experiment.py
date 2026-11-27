#!/usr/bin/env python3
"""Generate opt-in bitmap font experiment; never write into the main RP.

Requires Pillow and fonttools. Source font is pinned Noto Sans CJK JP Medium,
licensed under OFL 1.1; see art_sources/fonts/OFL.txt. Each Bedrock glyph page
is a 16x16 grid of UTF-16 BMP codepoints. Preserve E0–F8 private-use pages,
default8 and smooth-font files because replacing them without vanilla content
can erase controller/HUD icons or break special layout. This is not full font
coverage or a font corruption fix proven on a client.
"""
import hashlib,json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from fontTools.ttLib import TTFont
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art_sources/fonts/NotoSansCJKjp-Medium.otf'
DEST=ROOT/'experimental_packs/Hakkai_Japanese_Font_Test'
HASH='dd523e580e3413c480b2d701bf64e534c20f8419e3cfb6a44c2bdcd8d2a6c052'
PAGES=[0,0x30,0x31,*range(0x34,0xA0),0xF9,0xFA,0xFF]

def build():
 assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==HASH,'font source differs from pinned version'
 cmap=TTFont(SOURCE).getBestCmap();font=ImageFont.truetype(str(SOURCE),30)
 directory=DEST/'font';directory.mkdir(parents=True,exist_ok=True)
 for old in directory.glob('glyph_*.png'):old.unlink()
 total=0
 for page in PAGES:
  sheet=Image.new('RGBA',(512,512),(255,255,255,0))
  for cell in range(256):
   cp=page*256+cell
   if cp not in cmap or cp<0x20 or cp in range(0x7f,0xa0):continue
   tile=Image.new('RGBA',(32,32),(255,255,255,0));draw=ImageDraw.Draw(tile)
   # Fixed baseline, matching the common Bedrock atlas convention. Clipping is
   # confined to the cell; real client glyph metrics still require validation.
   draw.text((0,-8),chr(cp),font=font,fill=(255,255,255,255),stroke_width=0)
   sheet.paste(tile,((cell%16)*32,(cell//16)*32));total+=1
  sheet.save(directory/f'glyph_{page:02X}.png',optimize=True)
 manifest={'format_version':2,'header':{'name':'8界風記｜日本語フォント比較実験','description':'任意の比較用。未検証・表示不具合の解決は保証されません。','uuid':'4b3446bf-9f91-4952-ac54-40eae6509231','version':[0,2,0],'min_engine_version':[1,26,60]},'modules':[{'type':'resources','uuid':'96fb0b91-d1a7-4f82-8c04-39786e4414f4','version':[0,2,0]}]}
 (DEST/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 (DEST/'OFL.txt').write_bytes((ROOT/'art_sources/fonts/OFL.txt').read_bytes())
 (DEST/'NOTICE.txt').write_text('Glyphs derived from Noto Sans CJK JP Medium.\nCopyright 2014-2021 Adobe (http://www.adobe.com/).\nSource: https://github.com/googlefonts/noto-cjk/tree/f8d157532fbfaeda587e826d4cd5b21a49186f7c/Sans/OTF/Japanese\nFont licensed under SIL Open Font License 1.1; see OFL.txt.\n',encoding='utf8')
 print(f'{len(PAGES)} experimental glyph pages; {total} source font mappings; not client tested')
if __name__=='__main__':build()
