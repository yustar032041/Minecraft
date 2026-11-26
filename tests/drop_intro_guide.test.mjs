import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {RECYCLE_DROPS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_line_recipes.js';
test('recipe introduction explains shared 20 materials and both exchanges',async()=>{
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 const a=src.indexOf('async function recipeIndex('),b=src.indexOf('async function gearAcquisitionGuide(',a);assert.ok(a>=0&&b>a);
 const shown=[];const context={form:async()=>3,simple:async(_p,title,body)=>shown.push({title,body})};
 vm.createContext(context);vm.runInContext(src.slice(a,b),context);await context.recipeIndex({});
 assert.equal(shown.length,1);const text=shown[0].body;
 for(const word of ['20属性','共通','作業台','破砕機','同属性の欠片を2個','図鑑'])assert.ok(text.includes(word),word);
 assert.ok(!text.includes('専用素材'));
 assert.equal(Object.keys(RECYCLE_DROPS).length,20);
 for(let i=0;i<20;i++){
  const recipe=JSON.parse(fs.readFileSync(`Hakkai_v7.1.0/BehaviorPack/recipes/recycle_drop_element_${i}.json`,'utf8'))['minecraft:recipe_shapeless'];
  assert.deepEqual(recipe.ingredients,[{item:`hakkai:drop_element_${i}`}]);
  assert.equal(recipe.result.item,`hakkai:shard_${i}`);assert.equal(recipe.result.count,2);
  assert.equal(RECYCLE_DROPS[`hakkai:drop_element_${i}`],`hakkai:shard_${i}`);
 }
});
