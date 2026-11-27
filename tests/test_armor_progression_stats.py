"""Static armor policy, ID paths and values; not live Bedrock mitigation."""
import json,re,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];bp=root/'Hakkai_v7.1.0/BehaviorPack'
rows=json.loads((root/'tools/armor_progression_policy.json').read_text(encoding='utf8'))
assert len(rows)==44 and len({r['id'] for r in rows})==44
catalog=json.loads(re.search(r'^export const catalog=(\[.*\]);$',(bp/'scripts/data.js').read_text(encoding='utf8'),re.M)[1]);gear={g['id']:g for g in catalog}
assert sum(r['old']['protection']!=r['new']['protection'] for r in rows)==18
for row in rows:
 p=bp/'items'/f"{row['id']}.json";item=json.loads(p.read_text(encoding='utf8'))['minecraft:item'];c=item['components'];old=row['old'];new=row['new']
 assert item['description']['identifier']=='hakkai:'+row['id']
 assert c['minecraft:wearable']=={'slot':'slot.armor.'+row['slot'],'protection':new['protection']}
 assert c['minecraft:durability']['max_durability']==new['durability']
 assert new['protection']>=old['protection'] and new['durability']>=old['durability']
 if row['id'].startswith('gear_'):
  g=gear[row['id']];assert g['defense']==new['protection']
  assert g.get('skillDefense',g['defense'])==old['protection']
recipe=lambda id:json.loads((bp/'recipes'/f'{id}.json').read_text(encoding='utf8'))['minecraft:recipe_shapeless']
for family in range(5):
 for slot in ('head','chest','legs','feet'):
  chain=sorted((r for r in rows if r['family']==family and r['slot']==slot),key=lambda r:r['rank'])
  assert len(chain)==(3 if family==0 else 2)
  for before,after in zip(chain,chain[1:]):
   assert after['rank']==before['rank']+1
   for stat in ('protection','durability'):assert after['new'][stat]>=before['new'][stat],(before,after)
   r=recipe(after['id']);assert {'item':'hakkai:'+before['id']} in r['ingredients'] and r['result']['item']=='hakkai:'+after['id']
# All non-final armor stays at or below the endgame's declared maximum for
# each slot; no claim about actual protection caps or combat survivability.
for row in rows:
 part={'head':'helmet','chest':'chest','legs':'leggings','feet':'boots'}[row['slot']]
 final=json.loads((bp/'items'/f'ult_{part}.json').read_text())['minecraft:item']['components']
 assert row['new']['protection']<=final['minecraft:wearable']['protection']
 assert row['new']['durability']<final['minecraft:durability']['max_durability']
for name in ('gear_012','gear_060','gear_108','gear_156'):
 assert next(r for r in rows if r['id']==name)['new']['protection']>=2
subprocess.run([sys.executable,str(root/'tools/sync_armor_progression.py'),'--check'],check=True)
print('44 ordinary armor pieces: no weaker upgrade stats, synchronized labels, previous active-skill numbers (static only)')
