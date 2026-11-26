import json,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];bp=root/'Hakkai_v7.1.0/BehaviorPack'
for item in ('awaken_book','village_badge','wind_legacy_memorial'):
 components=json.loads((bp/'items'/f'{item}.json').read_text())['minecraft:item']['components']
 assert 'hakkai:use' in components and 'minecraft:interact_button' in components
cases=[('eclipse_core_to_time','eclipse_core','crystal_7',8),*[(f'festival_medal_{i}_to_crystal',f'festival_{i}',f'crystal_{n}',2) for i,n in enumerate((0,1,3,11))]]
for recipe,source,result,count in cases:
 r=json.loads((bp/'recipes'/f'{recipe}.json').read_text())['minecraft:recipe_shapeless']
 assert r['tags']==['crafting_table'] and r['ingredients']==[{'item':'hakkai:'+source}] and r['result']=={'item':'hakkai:'+result,'count':count}
 text=(bp/'scripts/recipe_index.js').read_text();assert 'hakkai:'+recipe in text and 'hakkai:'+source in text
toki=json.loads((bp/'recipes/toki_crystal_renewable.json').read_text())['minecraft:recipe_shapeless']
assert {x['item'] for x in toki['ingredients']}=={'hakkai:crystal_0','hakkai:crystal_4','minecraft:amethyst_shard'}
assert toki['result']=={'item':'hakkai:toki_crystal','count':2}
assert '覚醒・継承の画面' in (bp/'scripts/recipe_index.js').read_text()
subprocess.run([sys.executable,str(root/'tools/audit_item_references.py'),'--check'],check=True)
print('Keepsakes, awakening book, optional recycling recipes and inventory reference index checked (static)')
