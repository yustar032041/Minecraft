#!/usr/bin/env python3
import importlib.util,json,subprocess,sys,unittest
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('surplus',ROOT/'tools/sync_surplus_recipes.py')
surplus=importlib.util.module_from_spec(spec);spec.loader.exec_module(surplus)
R=ROOT/'Hakkai_v7.1.0/BehaviorPack/recipes'
def read(name):return json.loads((R/(name+'.json')).read_text())['minecraft:recipe_shapeless']
class SurplusTests(unittest.TestCase):
 def test_generator_and_collisions(self):
  subprocess.run([sys.executable,str(ROOT/'tools/sync_surplus_recipes.py'),'--check'],check=True)
  subprocess.run([sys.executable,str(ROOT/'tools/audit_crafting_collisions.py')],check=True)
 def test_crystal_path_all_twenty(self):
  for i in range(20):
   drop=read(f'recycle_drop_element_{i}');forge=read(f'forge_crystal_{i}');tonic=read('mana_tonic' if i==1 else f'surplus_crystal_{i}_mana')
   self.assertEqual(drop['result'],{'item':f'hakkai:shard_{i}','count':2})
   self.assertEqual(Counter(x['item'] for x in forge['ingredients']),Counter([f'hakkai:shard_{i}']*2+['minecraft:amethyst_shard']))
   self.assertEqual(forge['result'],{'item':f'hakkai:crystal_{i}','count':1})
   self.assertEqual(Counter(x['item'] for x in tonic['ingredients']),Counter([f'hakkai:crystal_{i}','minecraft:glass_bottle','minecraft:glow_berries']))
   self.assertEqual(tonic['result'],{'item':'hakkai:mana_tonic','count':1})
 def test_pearl_and_core_outputs(self):
  for i in range(8):
   for name,source,out,count in [(f'surplus_pearl_{i}_ender',f'hakkai:pearl_{i}','minecraft:ender_pearl',4),(f'surplus_guardian_core_{i}_diamond',f'hakkai:guardian_core_{i}','minecraft:diamond',2)]:
    r=read(name);self.assertEqual(r['ingredients'],[{'item':source}]);self.assertEqual(r['result'],{'item':out,'count':count})
  for name,core,count in [('surplus_king_core_scrap','eclipse_core',2),('surplus_warden_core_scrap','warden_core',4)]:
   r=read(name);self.assertEqual(Counter(x['item'] for x in r['ingredients']),Counter([f'hakkai:{core}','minecraft:iron_ingot']));self.assertEqual(r['result'],{'item':'minecraft:netherite_scrap','count':count})
 def test_no_json_recipe_can_recreate_consumed_boss_or_pearl(self):
  targets={f'hakkai:pearl_{i}' for i in range(8)}|{f'hakkai:guardian_core_{i}' for i in range(8)}|{'hakkai:eclipse_core','hakkai:warden_core'}
  for p in R.glob('*.json'):
   for key,value in json.loads(p.read_text()).items():
    if key.startswith('minecraft:recipe_'):
     out=value.get('result',value.get('output'))
     if isinstance(out,dict):out=out.get('item')
     self.assertNotIn(out,targets,p.name)
 def test_unlocked_and_existing_items(self):
  declared={json.loads(p.read_text())['minecraft:item']['description']['identifier'] for p in (ROOT/'Hakkai_v7.1.0/BehaviorPack/items').glob('*.json')}
  for name in surplus.recipes():
   r=read(name);self.assertEqual(r['unlock'],[{'context':'AlwaysUnlocked'}]);self.assertEqual(r['tags'],['crafting_table'])
   for v in [*r['ingredients'],r['result']]:
    if v['item'].startswith('hakkai:'):self.assertIn(v['item'],declared)
if __name__=='__main__':unittest.main()
