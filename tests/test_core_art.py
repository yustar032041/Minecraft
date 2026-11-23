"""Check creature-model markings on all generated core icons. Requires Pillow."""
import json,re,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from render_extra_item_icons import core_icon,wildlife_models,TEMPLATES,ITEMS
j=json.loads((root/'texture_progress.json').read_text(encoding='utf8'))
models=wildlife_models();base=Image.open(TEMPLATES/'core.png').convert('RGBA'); count=0
for name in j['derived_extra_existing']:
 match=re.fullmatch(r'drop_(foe|wild)_(\d)_(\d+)',name)
 if not match:continue
 category,r,i=match.group(1),int(match.group(2)),int(match.group(3));model=models[f'{category}_{r}_{i}']
 expected=core_icon(base,r,i,category,model)
 actual=Image.open(ITEMS/f'hakkai_{name}.png').convert('RGBA')
 assert expected.tobytes()==actual.tobytes(),name
 count+=1
assert count==104
print('104 creature core badges match the source mob model, realm and index')
