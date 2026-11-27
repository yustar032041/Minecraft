#!/usr/bin/env python3
"""Create a separate experimental .mcpack, never as the main release."""
import argparse,hashlib,json,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'experimental_packs/Hakkai_Japanese_Font_Test'
EXPECTED='4b3446bf-9f91-4952-ac54-40eae6509231'

def build(output):
 output=Path(output).resolve()
 if output.suffix.lower()!='.mcpack' or output.is_relative_to(SOURCE.resolve()):raise ValueError('output must be an .mcpack outside the source pack')
 manifest=json.loads((SOURCE/'manifest.json').read_text(encoding='utf8'))
 if manifest['header']['uuid']!=EXPECTED or manifest['header']['version']!=[0,2,0]:raise ValueError('unexpected experimental font identity')
 paths=sorted(p for p in SOURCE.rglob('*') if p.is_file())
 if any(p.is_symlink() for p in paths):raise ValueError('symlink not allowed')
 output.parent.mkdir(parents=True,exist_ok=True)
 if output.exists():raise FileExistsError(f'refusing to overwrite {output}')
 with zipfile.ZipFile(output,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for p in paths:
   info=zipfile.ZipInfo(p.relative_to(SOURCE).as_posix(),(2020,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
   z.writestr(info,p.read_bytes())
 with zipfile.ZipFile(output) as z:
  if z.testzip() or set(z.namelist())!={p.relative_to(SOURCE).as_posix() for p in paths}:raise ValueError('archive verification failed')
  for p in paths:
   assert hashlib.sha256(z.read(p.relative_to(SOURCE).as_posix())).digest()==hashlib.sha256(p.read_bytes()).digest()
 return len(paths)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args()
 print(f'Experimental font pack: {build(a.output)} files; client not tested')
