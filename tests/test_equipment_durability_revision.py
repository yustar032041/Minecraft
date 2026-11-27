"""Reproducible, raise-only equipment durability; no live anvil simulation."""
import json,subprocess,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
rows=json.loads((root/'tools/equipment_durability_policy.json').read_text())
assert len(rows)==250 and len({r['id'] for r in rows})==250
bp=root/'Hakkai_v7.1.0/BehaviorPack/items'
actual={p.stem for p in bp.glob('*.json') if 'minecraft:durability' in json.loads(p.read_bytes())['minecraft:item']['components']}
assert actual=={r['id'] for r in rows}|{f'warden_blade_{i}' for i in range(8)}
for i in range(8):
 c=json.loads((bp/f'warden_blade_{i}.json').read_bytes())['minecraft:item']['components']
 assert c['minecraft:durability']['max_durability']==5000 and c['minecraft:repairable']['repair_items']==[{'items':['minecraft:netherite_scrap'],'repair_amount':1250}]
for row in rows:
 c=json.loads((bp/(row['id']+'.json')).read_bytes())['minecraft:item']['components']
 assert row['new']==row['old']*2==c['minecraft:durability']['max_durability']
 assert c['minecraft:repairable']['repair_items'][0]['repair_amount']==(row['new']+3)//4
for tool in ['sync_equipment_durability.py','sync_equipment_repairs.py','sync_weapon_progression.py','sync_armor_progression.py']:
 subprocess.run([sys.executable,str(root/'tools'/tool),'--check'],check=True)
rp=root/'Hakkai_v7.1.0/ResourcePack/textures/items';base='hakkai_ult_pickaxe'
icons=[Image.open(rp/(base+s+'.png')).convert('RGBA') for s in ('','_normal','_mer')]
assert all(i.size==(128,128) for i in icons)
assert icons[0].getpixel((0,0))[3]==0
assert all(i.getchannel('A').tobytes()==icons[0].getchannel('A').tobytes() for i in icons[1:])
print('250 equipment durability/repair values and revised icon maps checked (static only)')
