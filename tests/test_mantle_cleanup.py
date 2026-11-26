import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1];pack=root/'Hakkai_v7.1.0';ids=[f'gear_{13+16*i:03}' for i in range(11)]
for ident in ids:
 for path in [pack/'BehaviorPack/items'/f'{ident}.json',pack/'BehaviorPack/recipes'/f'{ident}.json',pack/'ResourcePack/attachables'/f'{ident}.json',pack/'ResourcePack/particles'/f'{ident}.json']:
  assert not path.exists(),path
 for folder,prefix in [(pack/'ResourcePack/textures/items','hakkai_'),(pack/'ResourcePack/textures/hakkai/equipment','')]:
  assert not list(folder.glob(prefix+ident+'.*')) and not list(folder.glob(prefix+ident+'_*'))
# Verify there are no surviving content references in scripts, definitions,
# item atlas or translations. Historical markdown documents are not content.
for p in pack.rglob('*'):
 if not p.is_file() or p.suffix not in ('.js','.json','.lang'):continue
 text=p.read_text(encoding='utf8')
 for ident in ids:assert ident not in text,(ident,p)
progress=json.loads((root/'texture_progress.json').read_text())
for v in progress.values():
 if isinstance(v,list):assert not any(id in v for id in ids)
print('11 old mantle IDs and dedicated assets removed; no pack-content references remain (static)')
