#!/usr/bin/env python3
"""Build optional 32px custom-icon overlay to investigate item-atlas pressure.

Not a clock/compass fix. No vanilla items or their animated dial strips are
included. Apply above the main resource pack for an A/B test only.
"""
import argparse
import io
import json
from pathlib import Path
import re
import zipfile
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
RP=ROOT/'Hakkai_v7.1.0/ResourcePack'
MANIFEST={
 'format_version':2,
 'header':{'name':'8界風記｜時計表示の切り分け（32px）','description':'調査用：8界のアイコンを一時的に32pxにします。通常リソースパックより上に置いて比較してください。時計等は変更しません。',
 'uuid':'4ed294b5-c5a4-47af-a272-06348dc99460','version':[1,0,0],'min_engine_version':[1,26,60]},
 'modules':[{'type':'resources','uuid':'ffdd7a5c-c19b-41c7-b46e-cb1a09fc40fb','version':[1,0,0]}],
}
def encode(obj):return (json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode()
def build(destination):
 destination=Path(destination).resolve()
 if destination.suffix.lower()!='.mcpack' or destination.is_relative_to(RP.resolve()):raise ValueError('output must be an .mcpack outside the resource pack')
 atlas=json.loads((RP/'textures/item_texture.json').read_text(encoding='utf8'))['texture_data']
 data={};entries={'manifest.json':encode(MANIFEST)}
 for key,value in sorted(atlas.items()):
  if not re.fullmatch(r'hakkai_[a-z0-9_]+',key) or not isinstance(value.get('textures'),str):raise ValueError(f'unexpected atlas entry: {key}')
  source=(RP/(value['textures']+'.png')).resolve()
  if not source.is_relative_to((RP/'textures/items').resolve()):raise ValueError(f'unsafe source: {source}')
  name=f'textures/hakkai_dial_test/{key}'
  with Image.open(source) as image:
   image=image.convert('RGBA').resize((32,32),Image.Resampling.LANCZOS)
   buffer=io.BytesIO();image.save(buffer,format='PNG',optimize=True)
  entries[name+'.png']=buffer.getvalue();data[key]={'textures':name}
 entries['textures/item_texture.json']=encode({'resource_pack_name':'hakkai_dial_diagnostic','texture_name':'atlas.items','texture_data':data})
 destination.parent.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(destination,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for name,blob in sorted(entries.items()):
   info=zipfile.ZipInfo(name,date_time=(2020,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
   z.writestr(info,blob)
 with zipfile.ZipFile(destination) as z:
  if z.testzip() is not None or set(z.namelist())!=set(entries):raise ValueError('invalid archive')
 return len(data)
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',required=True);args=parser.parse_args()
 print(f'Diagnostic overlay: {build(args.output)} 32px custom icons; no vanilla dials modified')
