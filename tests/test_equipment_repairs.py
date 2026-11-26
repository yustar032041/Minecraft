"""Repair component coverage and changed values; no Bedrock anvil simulation."""
import json,math,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];items=root/'Hakkai_v7.1.0/BehaviorPack/items'
subprocess.run([sys.executable,str(root/'tools/sync_equipment_repairs.py'),'--check'],cwd=root,check=True)
for ident,material in [('gear_001','minecraft:iron_ingot'),('gear_081','minecraft:diamond'),('gear_161','minecraft:netherite_scrap'),('series_leggings_10','minecraft:netherite_scrap'),('guardian_armor_3_helmet','minecraft:diamond'),('gear_188','minecraft:diamond'),('gear_196','minecraft:netherite_scrap'),('ult_chest','minecraft:netherite_scrap')]:
 c=json.loads((items/(ident+'.json')).read_bytes())['minecraft:item']['components'];repair=c['minecraft:repairable']['repair_items']
 assert repair==[{'items':[material],'repair_amount':math.ceil(c['minecraft:durability']['max_durability']/4)}],ident
assert json.loads((items/'ult_chest.json').read_bytes())['minecraft:item']['components']['minecraft:repairable']['repair_items'][0]['repair_amount']==900
print('250 durable items: reviewed anvil repair material and quarter durability OK (static only)')
# The catalogue guide infers its material from rank; ensure this remains true
# across every entry, including armor and hand-held magic tools.
import re
source=(root/'Hakkai_v7.1.0/BehaviorPack/scripts/data.js').read_text(encoding='utf8')
catalog=json.loads(re.search(r'^export const catalog=(\[.*\]);\r?$',source,re.M)[1])
materials={1:'minecraft:iron_ingot',2:'minecraft:diamond',3:'minecraft:netherite_scrap'}
for gear in catalog:
 c=json.loads((items/(gear['id']+'.json')).read_bytes())['minecraft:item']['components']
 assert c['minecraft:repairable']['repair_items'][0]['items']==[materials[gear['rank']]],gear['id']
print('catalogue rank-to-repair guidance matches all equipment definitions')
