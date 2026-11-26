import json
from pathlib import Path
import subprocess
import sys
from collections import defaultdict
root=Path(__file__).resolve().parents[1];bp=root/'Hakkai_v7.1.0/BehaviorPack'
subprocess.run([sys.executable,str(root/'tools/generate_recipe_index.py'),'--check'],check=True)
text=(bp/'scripts/recipe_index.js').read_text()
index=json.loads(text.split('export const RECIPE_INDEX=',1)[1].split(';\n',1)[0])
uses=json.loads(text.split('export const RECIPE_USES=',1)[1].strip().removesuffix(';'))
files=list((bp/'recipes').glob('*.json'))
assert len(index)==len(files)
for name in ['compressor','mill','sorter','wind_rotor','water_wheel','crusher','washer','press','saw','mixer','assembler','miner','kiln','filter_router']:
 recipe=json.loads((bp/'recipes'/f'{name}.json').read_text())['minecraft:recipe_shapeless']
 assert recipe['result']['item']=='hakkai:'+name
 assert all(i['item'].startswith('minecraft:') for i in recipe['ingredients'])
 assert any(i['item']=='minecraft:redstone' for i in recipe['ingredients'])
 assert not (bp/'recipes'/f'{name}_vanilla.json').exists()
 assert any(recipe['description']['identifier'] in row[2] for row in index)
for name in ['island_stone','magic_hikari','magic_homura','magic_kaze','magic_kizuna','magic_mizu']:
 assert not (bp/'recipes'/f'{name}.json').exists()
 assert not (bp/'items'/f'{name}.json').exists()
tome=json.loads((bp/'recipes/element_tome.json').read_text())['minecraft:recipe_shapeless']
assert {i['item'] for i in tome['ingredients']}=={'minecraft:book','hakkai:crystal_0'}
for name in ('guide','industrial_guide','return_stone'):
 item=json.loads((bp/'items'/f'{name}.json').read_text())['minecraft:item']
 assert item['components']['minecraft:max_stack_size']==64
 assert 'hakkai:use' in item['components']
# No two exact shapeless ingredient multisets produce conflicting outputs.
shapes=defaultdict(set)
for f in files:
 recipe=json.loads(f.read_text()).get('minecraft:recipe_shapeless')
 if recipe:
  key=tuple(sorted(i.get('item',str(i)) for i in recipe['ingredients']))
  shapes[key].add(recipe['result']['item'])
assert all(len(outputs)==1 for outputs in shapes.values()),{k:v for k,v in shapes.items() if len(v)>1}
assert any('鉄の斧（minecraft:iron_axe）' in row[2] and 'hakkai:gear_001' in row[2] for row in index)
assert any('醸造台' in row[2] and 'hakkai:mana_brewing' in row[2] for row in index)
wind=next(r for r in uses if r[0]=='hakkai:crystal_0')
assert any('hakkai:element_tome' in index[i][2] for i in wind[2])
for _,_,references in uses:assert references and all(0<=i<len(index) for i in references)
print('Recipe index: ingredient reverse lookup, unique shapeless inputs, consolidation, 14 vanilla recipes and stackable guides (static)')
# Every vanilla material currently referenced by this generated index gets a
# human-readable Japanese name as well as its unambiguous raw ID.
for ident,label,_ in uses:
 if ident.startswith('minecraft:'):
  assert not label.startswith(ident.split(':',1)[1]+'（'),(ident,label)
assert any(row[0]=='minecraft:amethyst_shard' and row[1].startswith('アメジストの欠片') for row in uses)
# Single-purpose intermediates removed for new worlds; their final products
# have direct practical recipes and no pack text references the removed IDs.
from collections import Counter
bandage=json.loads((bp/'recipes/bandage.json').read_text())['minecraft:recipe_shapeless']
assert Counter(i['item'] for i in bandage['ingredients'])==Counter({'minecraft:string':2,'minecraft:paper':1})
plot=json.loads((bp/'recipes/season_plot.json').read_text())['minecraft:recipe_shapeless']
assert plot['result']=={'item':'hakkai:season_plot','count':2}
assert not (bp/'recipes/ranch_plot.json').exists()
for item in ('cloth','farm_fiber','barn_token'):
 assert not (bp/'items'/f'{item}.json').exists()
 for pack in (bp,root/'Hakkai_v7.1.0/ResourcePack'):
  for p in pack.rglob('*'):
   if p.is_file() and p.suffix in ('.json','.js','.lang'):
    text=p.read_text(encoding='utf8')
    assert 'hakkai:'+item not in text and 'hakkai_'+item not in text,(item,p)

# Armor leggings are grouped with gear; scroll description matches its use.
for i in range(11):
 row=next(r for r in index if r[1].endswith(f'（hakkai:series_leggings_{i:02}）'))
 assert row[0]==0
scroll=next(r for r in index if r[1].endswith('（hakkai:dodge_scroll）'))
assert '移動速度上昇Iが8秒間' in scroll[2] and '無敵や攻撃回避ではありません' in scroll[2]
# Combat aids are usable, indexed with accurate effects, and co-located in the catalog.
from collections import Counter
spec=[('dodge_scroll','俊足の巻物','移動速度上昇Iが8秒間',{'hakkai:toki_crystal':2,'minecraft:paper':1,'minecraft:feather':1}),('taunt_scroll','防御の巻物','耐性Iが8秒間',{'hakkai:toki_crystal':2,'minecraft:paper':1,'minecraft:iron_ingot':1}),('war_horn','戦意の角笛','攻撃力上昇Iが10秒間',{'hakkai:toki_crystal':2,'minecraft:goat_horn':1,'minecraft:copper_ingot':1})]
for id,label,description,inputs in spec:
 item=json.loads((bp/'items'/f'{id}.json').read_text())['minecraft:item'];assert 'hakkai:use' in item['components'] and 'minecraft:interact_button' in item['components'] and 'menu_category' not in item['description']
 recipe=json.loads((bp/'recipes'/f'{id}.json').read_text())['minecraft:recipe_shapeless'];assert Counter(x['item'] for x in recipe['ingredients'])==Counter(inputs)
 row=next(r for r in index if r[1].endswith(f'（hakkai:{id}）'));assert row[1].startswith(label) and description in row[2]
for id in ['nightwalker_armor_helmet','nightwalker_armor_leggings','nightwalker_armor_boots','united_armor_helmet','united_armor_leggings','united_armor_boots']:
 row=next(r for r in index if r[1].endswith(f'（hakkai:{id}）'));assert row[0]==0 and '引き継がれません' in row[2]
