#!/usr/bin/env python3
"""Build an isolated, explicitly non-release playtest from current sources.

Every input byte contributes to distinct deterministic UUIDs; published pack
identity and source files are never changed. Do not activate with the main pack
in the same world because the gameplay identifiers are intentionally identical.
"""
import argparse,copy,hashlib,io,json,shutil,tempfile,uuid,zipfile
from pathlib import Path
from sync_crafting_unlocks import run as check_crafting_unlocks
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'Hakkai_v7.1.0'
PACKS=('BehaviorPack','ResourcePack')
VERSION=[0,1,0]

def paths():
 for pack in PACKS:
  for p in sorted((SOURCE/pack).rglob('*')):
   if p.is_symlink():raise ValueError(f'symlink not supported: {p}')
   if p.is_file():yield pack,p,p.relative_to(SOURCE/pack).as_posix()

def source_hash(files):
 fingerprint=hashlib.sha256()
 for pack,path,name in files:
  fingerprint.update((pack+'/'+name+'\0').encode())
  with path.open('rb') as f:
   while chunk:=f.read(1024*1024):fingerprint.update(chunk)
 return fingerprint.hexdigest()

def build(destination):
 destination=Path(destination).resolve()
 if destination.suffix.lower()!='.mcaddon' or destination.is_relative_to(SOURCE.resolve()):raise ValueError('output must be an .mcaddon outside the source packs')
 if destination.exists():raise FileExistsError('never overwrite an existing archive')
 if not check_crafting_unlocks():raise ValueError('crafting unlock data is incomplete')
 files=list(paths());digest=source_hash(files)
 def identity(label):return str(uuid.uuid5(uuid.NAMESPACE_URL,'https://hakkai.invalid/public-playtest-v1/'+digest+'/'+label))
 manifests={p:json.loads((SOURCE/p/'manifest.json').read_text(encoding='utf8')) for p in PACKS}
 bp,rp=(copy.deepcopy(manifests[p]) for p in PACKS);oldrp=rp['header']['uuid']
 for pack,m in zip(PACKS,(bp,rp)):
  m['header']['name']='[試作・新規ワールド専用] '+m['header']['name']
  m['header']['description']='試験公開の動作確認用。正式版・既存ワールドと併用しない。実機未検証。'
  m['header']['version']=VERSION;m['header']['uuid']=identity(pack+'/header')
  for i,module in enumerate(m['modules']):module['version']=VERSION;module['uuid']=identity(f'{pack}/module/{i}')
 for dependency in bp['dependencies']:
  if dependency.get('uuid')==oldrp:dependency['uuid']=rp['header']['uuid'];dependency['version']=VERSION
 if not any(d.get('uuid')==rp['header']['uuid'] and d.get('version')==VERSION for d in bp['dependencies']):raise ValueError('missing resource dependency')
 destination.parent.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='hakkai-playtest-',dir=destination.parent) as td:
  tmp=Path(td);built=[]
  for pack,manifest in zip(PACKS,(bp,rp)):
   out=tmp/(pack+'.mcpack');expected={name for p,_,name in files if p==pack}
   with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for p,path,name in files:
     if p!=pack:continue
     info=zipfile.ZipInfo(name,(2020,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
     if name=='manifest.json':z.writestr(info,(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode())
     else:
      with z.open(info,'w') as dst,path.open('rb') as src:shutil.copyfileobj(src,dst,1024*1024)
   with zipfile.ZipFile(out) as z:
    if z.testzip() or set(z.namelist())!=expected or len(z.namelist())!=len(expected):raise ValueError(f'{pack} archive failed verification')
    for p,path,name in files:
     if p!=pack or name=='manifest.json':continue
     h=hashlib.sha256()
     with z.open(name) as f:
      while chunk:=f.read(1024*1024):h.update(chunk)
     original=hashlib.sha256()
     with path.open('rb') as f:
      while chunk:=f.read(1024*1024):original.update(chunk)
     if h.digest()!=original.digest():raise ValueError(f'source changed during build: {pack}/{name}')
   built.append(out)
  bundle=tmp/'bundle.mcaddon'
  with zipfile.ZipFile(bundle,'w',compression=zipfile.ZIP_STORED) as z:
   for p in built:
    info=zipfile.ZipInfo(p.name,(2020,1,1,0,0,0));info.compress_type=zipfile.ZIP_STORED;info.external_attr=0o100644<<16
    with z.open(info,'w') as dst,p.open('rb') as src:shutil.copyfileobj(src,dst,1024*1024)
  with zipfile.ZipFile(bundle) as z:
   if z.testzip() or set(z.namelist())!={'BehaviorPack.mcpack','ResourcePack.mcpack'}:raise ValueError('bundle verification failed')
  if list(paths())!=files or source_hash(files)!=digest:raise ValueError('source changed during playtest build')
  # Create exclusively; do not replace an existing release or test archive.
  with destination.open('xb') as dst,bundle.open('rb') as src:shutil.copyfileobj(src,dst,1024*1024)
 return digest,bp['header']['uuid'],rp['header']['uuid'],len(files)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args()
 digest,bp,rp,count=build(a.output)
 print(f'Isolated playtest (NOT a release): {count} files; source={digest}; BP={bp}; RP={rp}; no Bedrock import/gameplay verification')
