"""Weapon names, progression, recipes and catalog; this is not a Bedrock test."""
import collections,json,re,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from organize_weapons import KINDS,KEYS,BASE,ATTRS,ROMAN,EN_ATTR,EN,JA_DISPLAY
from material_progression import with_tier_material
bp=root/'Hakkai_v7.1.0/BehaviorPack';rp=root/'Hakkai_v7.1.0/ResourcePack'
text=(bp/'scripts/data.js').read_text();data=json.loads(re.search(r'^export const catalog=(\[.*\]);$',text,re.M)[1]);weapons=[g for g in data if g['kind'] in KINDS];assert len(weapons)==141
lang={}
for language in ['ja_JP','en_US']:
 lang[language]=dict(line.split('=',1) for line in (rp/'texts'/f'{language}.lang').read_text().splitlines() if '=' in line)
groups=json.loads((bp/'item_catalog/crafting_item_catalog.json').read_text())['minecraft:crafting_items_catalog']['categories'][0]['groups'];expected={}
for kind,key in zip(KINDS,KEYS):
 group=next(g for g in groups if g['group_identifier']['name']==f'hakkai:weapons_{key}')
 members=sorted((g for g in weapons if g['kind']==kind),key=lambda g:((int(g['number'])-1)%80,g['rank']))
 assert group['items']==['hakkai:'+g['id'] for g in members]
 assert group['group_identifier']['icon'] in group['items']
 assert all(f'hakkai:weapons_{key}' in lang[x] for x in lang)
for g in weapons:
 id=g['id'];n=int(g['number']);rank=g['rank'];assert g['prev']==(f'gear_{n-80:03}' if n>80 else None)
 title=f"{ATTRS[g['a']]}の{JA_DISPLAY.get(g['kind'],g['kind'])}・{ATTRS[g['modifier']]}型 {ROMAN[rank-1]}"
 assert g['name']==g['label']==lang['ja_JP'][f'item.hakkai:{id}.name']==title
 assert lang['en_US'][f'item.hakkai:{id}.name']==f"{EN_ATTR[g['a']]} {EN[KINDS.index(g['kind'])]} · {EN_ATTR[g['modifier']]} {ROMAN[rank-1]}"
 item=json.loads((bp/'items'/f'{id}.json').read_text())['minecraft:item'];assert 'menu_category' not in item['description'] and item['description']['identifier']=='hakkai:'+id
 r=json.loads((bp/'recipes'/f'{id}.json').read_text())['minecraft:recipe_shapeless'];ingredients=([f"hakkai:{g['prev']}"] if g['prev'] else BASE[g['kind']])+[f"hakkai:crystal_{g['a']}",f"hakkai:shard_{g['modifier']}"]
 ingredients=with_tier_material(ingredients,rank)
 assert r['result']=={'item':'hakkai:'+id,'count':1};assert collections.Counter(x['item'] for x in r['ingredients'])==collections.Counter(ingredients);expected[id]=collections.Counter(ingredients)
 assert g['prev'] is None or next(x for x in weapons if x['id']==g['prev'])['kind']==g['kind']
# New shapeless recipes must not share an input multiset with any shaped or
# shapeless recipe, even if a shaped pattern would normally differ.
for p in (bp/'recipes').glob('*.json'):
 data=json.loads(p.read_text());r=data.get('minecraft:recipe_shapeless') or data.get('minecraft:recipe_shaped')
 if not r:continue
 items=[x.get('item') for x in r['ingredients']] if 'ingredients' in r else [r['key'][c].get('item') for row in r['pattern'] for c in row if c!=' ']
 for id,ing in expected.items():
  if p.stem!=id:assert collections.Counter(items)!=ing,(id,p.name)
print('141 weapons and tools: ordered twelve kinds, names, progression, recipes, no matching JSON inputs (static)')
