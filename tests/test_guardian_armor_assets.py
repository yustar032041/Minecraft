import collections,json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=root/'BehaviorPack';rp=root/'ResourcePack'
cat=json.loads((bp/'item_catalog/crafting_item_catalog.json').read_text())['minecraft:crafting_items_catalog']['categories'][0]['groups']
recipes={}
for i in range(8):
 group=next(g for g in cat if g['group_identifier']['name']==f'hakkai:armor_guardian_{i}')
 assert group['items']==[f'hakkai:gear_{188+i}',f'hakkai:gear_{196+i}',f'hakkai:gear_{204+i}',*[f'hakkai:guardian_armor_{i}_{part}' for part in ('helmet','leggings','boots')]]
 for part,base,slot,protect in [('helmet','diamond_helmet','head',3),('leggings','diamond_leggings','legs',5),('boots','diamond_boots','feet',2)]:
  id=f'guardian_armor_{i}_{part}';ident='hakkai:'+id
  item=json.loads((bp/'items'/f'{id}.json').read_text())['minecraft:item'];assert item['description']['identifier']==ident
  assert item['components']['minecraft:wearable']=={'slot':f'slot.armor.{slot}','protection':protect}
  assert ident in group['items'] and 'menu_category' not in item['description']
  recipe=json.loads((bp/'recipes'/f'{id}.json').read_text())['minecraft:recipe_shapeless'];key=collections.Counter(x['item'] for x in recipe['ingredients'])
  assert key==collections.Counter(['minecraft:'+base,f'hakkai:crystal_{i}',f'hakkai:shard_{i}','minecraft:emerald']);recipes[id]=key
  assert recipe['result']=={'item':ident,'count':1}
  a=json.loads((rp/'attachables'/f'{id}.json').read_text())['minecraft:attachable']['description'];assert a['identifier']==ident and a['geometry']['default']==f'geometry.hakkai.icon_armor_{part}' and a['textures']['default']==f'textures/hakkai/equipment/{id}'
  for suffix in ['.png','_n.png','_mer.png']:
   assert Image.open(rp/'textures/hakkai/equipment'/f'{id}{suffix}').size==(128,128)
   assert (rp/'textures/items'/f'hakkai_{id}{"_normal.png" if suffix=="_n.png" else suffix}').exists()
  for lang in ['ja_JP','en_US']:assert f'item.{ident}.name=' in (rp/'texts'/f'{lang}.lang').read_text()
for f in (bp/'recipes').glob('*.json'):
 d=json.loads(f.read_text());r=d.get('minecraft:recipe_shapeless') or d.get('minecraft:recipe_shaped')
 if not r:continue
 items=[x.get('item') for x in r['ingredients']] if 'ingredients' in r else [r['key'][c].get('item') for row in r['pattern'] for c in row if c!=' ']
 for id,key in recipes.items():
  if f.stem!=id:assert collections.Counter(items)!=key,(id,f)
print('8 guardian sets: 24 parts, recipes, slots, assets and no conflicting JSON inputs (static)')
