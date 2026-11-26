import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BASE,EQUIPMENT,loadEquipmentRecipes,oreRoutes,reachable,report} from '../tools/audit_factory_bootstrap.mjs';
import {factoryRecipe} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_network.js';

const rules=loadEquipmentRecipes(),routes=oreRoutes();
test('65 named factory block recipes resolve without any additional item as a seed',()=>{
 assert.equal(EQUIPMENT.length,65);assert.equal(new Set(EQUIPMENT).size,65);
 assert.equal(BASE.filter(x=>x.startsWith('hakkai:')).length,0);
 const {missing,reached}=report(rules,routes);assert.deepEqual(missing,[]);
 for(const name of EQUIPMENT){
  const block=JSON.parse(fs.readFileSync(`Hakkai_v7.1.0/BehaviorPack/blocks/${name}.json`));
  assert.equal(block['minecraft:block'].description.identifier,`hakkai:${name}`);
  assert.ok(reached.has(`hakkai:${name}`));
 }
});
test('all raw metal doubling stages are taken from actual recipes and require equipment',()=>{
 assert.equal(routes.length,9);
 for(const metal of ['iron','gold','copper']){
  const [crush,wash,mill]=routes.filter(r=>r.name.endsWith(`:${metal}`));
  assert.equal(crush.costs[0].id,`minecraft:raw_${metal}`);assert.equal(crush.amount,2);
  assert.equal(wash.costs[0].id,crush.out);assert.equal(mill.costs[0].id,wash.out);
  assert.equal(mill.out,`minecraft:${metal}_ingot`);
  for(const row of [crush,wash,mill]){
   assert.ok(row.costs.some(c=>c.id==='minecraft:barrel'&&c.count===2));
   assert.ok(row.costs.some(c=>c.id==='hakkai:wind_rotor'));
  }
  assert.ok(wash.costs.some(c=>c.id==='world:water_source'));
 }
 assert.throws(()=>oreRoutes((kind,id)=>kind==='crusher'?['bad',1,2]:factoryRecipe(kind,id)),/Unexpected/);
});
test('fixed point refuses unseeded cycles, missing water, equipment, and materials',()=>{
 const cycle=[{out:'x:a',costs:[{id:'x:b'}]},{out:'x:b',costs:[{id:'x:a'}]}];
 assert.equal(reachable(cycle,[]).size,0);assert.equal(reachable(cycle,['x:a']).size,2);
 const noWater=reachable([...rules,...routes],BASE.filter(x=>x!=='world:water_source'));
 assert.ok(noWater.has('hakkai:crushed_iron'));assert.ok(!noWater.has('hakkai:washed_iron'));
 const noCrusher=reachable([...rules.filter(r=>r.out!=='hakkai:crusher'),...routes],BASE);
 assert.ok(!noCrusher.has('hakkai:crushed_iron'));
 const noIron=reachable([...rules,...routes],BASE.filter(x=>x!=='minecraft:iron_ingot'));
 assert.ok(!noIron.has('hakkai:shaft'));
});
test('unknown ingredients, station or formats fail closed',()=>{
 const make=(r)=>JSON.stringify({'minecraft:recipe_shapeless':r});
 const sample={tags:['crafting_table'],ingredients:[{item:'minecraft:stone'}],result:{item:'hakkai:crusher',count:1}};
 assert.throws(()=>loadEquipmentRecipes(['crusher'],()=>make({...sample,ingredients:[{tag:'minecraft:stone'}]})),/ingredient/);
 assert.throws(()=>loadEquipmentRecipes(['crusher'],()=>make({...sample,tags:['furnace']})),/unsupported/);
 assert.throws(()=>loadEquipmentRecipes(['crusher'],()=>make({...sample,result:{item:'hakkai:wrong'}})),/unsupported/);
 assert.throws(()=>loadEquipmentRecipes(['crusher'],()=>JSON.stringify({'minecraft:recipe_shaped':sample})),/type/);
});
test('generated audit remains in sync with recipe and production definitions',()=>{
 assert.equal(fs.readFileSync('工業設備の依存関係検査.md','utf8'),report(rules,routes).text);
});
test('new recipes in covered equipment families are not silently omitted',()=>{
 const family=/^(?:crusher|washer|press|saw|compressor|mill|kiln|mixer|assembler|miner|sorter|shaft|clutch|gear_(?:up|down)(?:_.*)?|wind_rotor|water_wheel|conveyor|factory_pipe(?:_.*)?|filter_router|farm_(?:planter|harvester|fertilizer)|item_(?:duct|extractor(?:_.*)?)|fluid_(?:pipe|tank|basin|loader|pump(?:_.*)?)|gantry(?:_.*)?|bearing)$/;
 const all=fs.readdirSync('Hakkai_v7.1.0/BehaviorPack/recipes').filter(x=>x.endsWith('.json')).map(x=>x.slice(0,-5)).filter(x=>family.test(x)).sort();
 assert.deepEqual([...EQUIPMENT].sort(),all);
});
