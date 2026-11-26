"""Static checks: Bedrock UI ordering/rendering still needs an in-game test."""
import collections,json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1];bp=root/'Hakkai_v7.1.0/BehaviorPack';rp=root/'Hakkai_v7.1.0/ResourcePack'
cat=json.loads((bp/'item_catalog/crafting_item_catalog.json').read_text())
assert cat['format_version']=='1.21.60'
sections=cat['minecraft:crafting_items_catalog']['categories'];assert len(sections)==1 and sections[0]['category_name']=='equipment'
groups=sections[0]['groups'];assert len(groups)==29
flat=[id for g in groups for id in g['items']];assert len(flat)==len(set(flat))==250
wearable={}
for p in (bp/'items').glob('*.json'):
 d=json.loads(p.read_text())['minecraft:item'];wear=d['components'].get('minecraft:wearable')
 if wear:wearable[d['description']['identifier']]=wear['slot']
weapons=set()
raw=(bp/'scripts/data.js').read_text();data0=json.loads(re.search(r'^export const catalog=(\[.*\]);$',raw,re.M)[1])
for g in data0:
 if g['kind'] in ['剣','斧','弓','杖','ハンマー','槍','盾','扇','指輪','首飾り','本','石']:weapons.add('hakkai:'+g['id'])
assert len(weapons)==141
assert set(flat)==set(wearable)|weapons|{'hakkai:dodge_scroll','hakkai:taunt_scroll','hakkai:war_horn'}
assert groups[16]['items']==['hakkai:dodge_scroll','hakkai:taunt_scroll','hakkai:war_horn']
for id in flat:
 item=json.loads((bp/'items'/f'{id.split(":",1)[1]}.json').read_text())['minecraft:item']
 assert 'menu_category' not in item['description'],id
for lang in ['ja_JP','en_US']:
 lines=dict(line.split('=',1) for line in (rp/'texts'/f'{lang}.lang').read_text().splitlines() if '=' in line)
 for g in groups:
  assert g['group_identifier']['icon'] in g['items']
  assert g['group_identifier']['name'] in lines
  assert all(f'item.{x}.name' in lines for x in g['items'])
 if lang=='ja_JP':ja=lines
s=(bp/'scripts/data.js').read_text();data=json.loads(re.search(r'^export const catalog=(\[.*\]);$',s,re.M)[1]);labels={g['id']:g['label'] for g in data}
family=['霧銀装','深影装','紅蓮装','大地装','雷光装'];levels=['I','II','III'];materials=[10,6,2,3,4]
expected=[]
for f in range(5):
 ids=[]
 for i in range(f,11,5):ids.extend([f'hakkai:gear_{11+16*i:03}',f'hakkai:gear_{10+16*i:03}',f'hakkai:series_leggings_{i:02}',f'hakkai:gear_{12+16*i:03}'])
 assert groups[f]['items']==ids
for i in range(11):
 title=f'{family[i%5]} {levels[i//5]}';mat=materials[i%5]
 for part,base,partname,vanilla in [('head',11,'兜','iron_helmet'),('chest',10,'鎧','iron_chestplate'),('legs',None,'レギンス','iron_leggings'),('feet',12,'靴','iron_boots')]:
  id=f'gear_{base+16*i:03}' if base else f'series_leggings_{i:02}'
  prev=(f'gear_{base+16*(i-5):03}' if base else f'series_leggings_{i-5:02}') if i>=5 else None
  assert ja[f'item.hakkai:{id}.name']==f'{title}の{partname}'
  if base:assert labels[id]==ja[f'item.hakkai:{id}.name']
  recipe=json.loads((bp/'recipes'/f'{id}.json').read_text())['minecraft:recipe_shapeless']
  key=collections.Counter(x['item'] for x in recipe['ingredients']);want=collections.Counter([f'hakkai:{prev}' if prev else f'minecraft:{vanilla}',f'hakkai:crystal_{mat}',f'hakkai:shard_{mat}']+([] if i<5 else ['minecraft:diamond' if i<10 else 'minecraft:netherite_ingot']))
  assert key==want and recipe['result']=={'item':'hakkai:'+id,'count':1};expected.append((id,key))
assert labels['gear_186']==ja['item.hakkai:gear_186.name']
# Detect both shaped/shapeless ambiguities for the new inputs. Order of a
# shaped pattern does not make it safe from an overlapping shapeless recipe.
for p in (bp/'recipes').glob('*.json'):
 d=json.loads(p.read_text());r=d.get('minecraft:recipe_shapeless') or d.get('minecraft:recipe_shaped')
 if not r:continue
 if 'ingredients' in r:items=[x.get('item') for x in r['ingredients']]
 else:items=[r['key'][c].get('item') for row in r['pattern'] for c in row if c!=' ']
 for id,key in expected:
  if p.stem!=id:assert collections.Counter(items)!=key,(id,p.name)
print('Armor names, 106 wearable entries + 3 combat aids + 141 held weapons/tools, 44 aligned recipes and collision checks OK (static)')
