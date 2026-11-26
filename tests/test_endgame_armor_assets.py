import collections,json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=root/'BehaviorPack';rp=root/'ResourcePack'
groups=json.loads((bp/'item_catalog/crafting_item_catalog.json').read_text())['minecraft:crafting_items_catalog']['categories'][0]['groups']
recipes={}
for family,chests,materials in [('nightwalker',['gear_186','gear_187'],['hakkai:crystal_6','hakkai:shard_18','minecraft:emerald']),('united',['gear_212','gear_213'],['hakkai:crystal_7','hakkai:chronicle_fragment','minecraft:emerald'])]:
 group=next(g for g in groups if g['group_identifier']['name']==f'hakkai:armor_{family}')
 assert group['items']==['hakkai:'+x for x in [f'{family}_armor_helmet',*chests,f'{family}_armor_leggings',f'{family}_armor_boots']]
 for part,base,slot,protect in [('helmet','iron_helmet','head',3),('leggings','iron_leggings','legs',5),('boots','iron_boots','feet',2)]:
  base=base.replace('iron_', 'diamond_' if family=='nightwalker' else 'netherite_')
  id=f'{family}_armor_{part}';ident='hakkai:'+id
  item=json.loads((bp/'items'/f'{id}.json').read_text())['minecraft:item'];assert item['description']['identifier']==ident and 'menu_category' not in item['description']
  assert item['components']['minecraft:wearable']=={'slot':f'slot.armor.{slot}','protection':protect}
  recipe=json.loads((bp/'recipes'/f'{id}.json').read_text())['minecraft:recipe_shapeless'];key=collections.Counter(x['item'] for x in recipe['ingredients']);assert key==collections.Counter(['minecraft:'+base,*materials]);recipes[id]=key
  assert recipe['result']=={'item':ident,'count':1}
  a=json.loads((rp/'attachables'/f'{id}.json').read_text())['minecraft:attachable']['description'];assert a['identifier']==ident and a['geometry']['default']==f'geometry.hakkai.icon_armor_{part}' and a['textures']['default']==f'textures/hakkai/equipment/{id}'
  for suffix in ['.png','_n.png','_mer.png']:
   assert Image.open(rp/'textures/hakkai/equipment'/f'{id}{suffix}').size==(128,128)
   assert (rp/'textures/items'/f'hakkai_{id}{"_normal.png" if suffix=="_n.png" else suffix}').exists()
  for lang in ['ja_JP','en_US']:assert f'item.{ident}.name=' in (rp/'texts'/f'{lang}.lang').read_text()
r=json.loads((bp/'recipes/gear_186.json').read_text())['minecraft:recipe_shapeless'];recipes['gear_186']=collections.Counter(x['item'] for x in r['ingredients']);assert recipes['gear_186']==collections.Counter(['hakkai:gear_106','hakkai:crystal_6','hakkai:shard_18','minecraft:emerald','minecraft:netherite_scrap'])
for f in (bp/'recipes').glob('*.json'):
 d=json.loads(f.read_text());r=d.get('minecraft:recipe_shapeless') or d.get('minecraft:recipe_shaped')
 if not r:continue
 items=[x.get('item') for x in r['ingredients']] if 'ingredients' in r else [r['key'][c].get('item') for row in r['pattern'] for c in row if c!=' ']
 for id,key in recipes.items():
  if f.stem!=id:assert collections.Counter(items)!=key,(id,f)
print('2 endgame sets: 6 parts, 7 recipes, ordered catalog, assets and no conflicting JSON inputs (static)')
