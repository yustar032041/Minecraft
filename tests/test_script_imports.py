"""Local module graph and script entry check; no JS runtime/Bedrock emulation."""
import json,re
from pathlib import Path
bp=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/BehaviorPack'
manifest=json.loads((bp/'manifest.json').read_text(encoding='utf-8-sig'))
entry=next(m['entry'] for m in manifest['modules'] if m.get('type')=='script')
modules={d['module_name'] for d in manifest['dependencies'] if 'module_name' in d}
seen=set();pending=[bp/entry]
while pending:
 path=pending.pop().resolve()
 assert path.is_relative_to(bp.resolve()) and path.is_file(),path
 if path in seen:continue
 seen.add(path)
 text=path.read_text(encoding='utf8')
 for source in re.findall(r'''(?:\bfrom\s*|\bimport\s*)["']([^"']+)["']''',text):
  if source.startswith('.'):
   dependency=(path.parent/source).resolve()
   assert dependency.is_relative_to(bp.resolve()) and dependency.is_file(),f'{path}: {source}'
   pending.append(dependency)
  else:
   assert source in modules,f'{path}: undeclared module {source}'
print(f'Script entry and {len(seen)} reachable local modules checked (static only)')
