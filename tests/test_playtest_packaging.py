"""Isolated tiny fixture verifies the preview builder, not Bedrock imports."""
import hashlib,json,sys,tempfile,zipfile,io
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
import build_playtest_mcaddon as tool
original_source,original_check=tool.SOURCE,tool.check_crafting_unlocks
try:
 with tempfile.TemporaryDirectory() as td:
  root=Path(td)/'source';tool.SOURCE=root;tool.check_crafting_unlocks=lambda:True
  for name in ('BehaviorPack','ResourcePack'):(root/name).mkdir(parents=True)
  bp={'format_version':2,'header':{'name':'bp','description':'x','uuid':'bp-original','version':[7,1,64]},'modules':[{'type':'data','uuid':'data-original','version':[7,1,64]},{'type':'script','uuid':'script-original','version':[7,1,64]}],'dependencies':[{'uuid':'rp-original','version':[7,1,64]},{'module_name':'@minecraft/server','version':'2.11.0'}]}
  rp={'format_version':2,'header':{'name':'rp','description':'x','uuid':'rp-original','version':[7,1,64]},'modules':[{'type':'resources','uuid':'resource-original','version':[7,1,64]}]}
  for name,m in (('BehaviorPack',bp),('ResourcePack',rp)):(root/name/'manifest.json').write_text(json.dumps(m))
  (root/'BehaviorPack/a.js').write_text('original')
  a,b,c=(Path(td)/f'{v}.mcaddon' for v in 'abc')
  result=tool.build(a);assert tool.build(b)==result;assert hashlib.sha256(a.read_bytes()).digest()==hashlib.sha256(b.read_bytes()).digest()
  with zipfile.ZipFile(a) as z:
   assert z.testzip() is None
   def manifest(n):
    with zipfile.ZipFile(io.BytesIO(z.read(n+'.mcpack'))) as inner:return json.loads(inner.read('manifest.json'))
   ba,ra=manifest('BehaviorPack'),manifest('ResourcePack')
   assert ba['header']['uuid']==result[1] and ra['header']['uuid']==result[2]
   assert ba['header']['uuid']!='bp-original' and ra['header']['uuid']!='rp-original'
   assert '[試作' in ba['header']['name'] and ba['header']['version']==ra['header']['version']==[0,1,0]
   assert any(d.get('uuid')==ra['header']['uuid'] and d.get('version')==[0,1,0] for d in ba['dependencies'])
   assert len({ba['header']['uuid'],ra['header']['uuid'],*(m['uuid'] for m in ba['modules']),ra['modules'][0]['uuid']})==5
  assert json.loads((root/'BehaviorPack/manifest.json').read_text())==bp
  try:tool.build(a);raise AssertionError('overwrite must be rejected')
  except FileExistsError:pass
  (root/'BehaviorPack/a.js').write_text('changed');new=tool.build(c)
  assert result[0]!=new[0] and result[1]!=new[1] and result[2]!=new[2]
finally:
 tool.SOURCE,tool.check_crafting_unlocks=original_source,original_check
print('Playtest pack: deterministic unique identities, dependencies and non-overwrite checks pass (fixture, not a client test)')
