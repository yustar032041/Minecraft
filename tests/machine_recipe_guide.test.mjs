import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {MACHINE_RECIPES,MACHINE_RECIPE_GROUPS,searchMachineRecipes} from '../Hakkai_v7.1.0/BehaviorPack/scripts/machine_recipe_guide.js';
import {factoryRecipe} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_network.js';
import {RECYCLE_DROPS,LINE_RECIPES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_line_recipes.js';
import {farmGuideCrops,farmCrop,farmSeed} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_farm.js';
import {MINER_DEPTH,miningGuideTargets,miningResult,miningPassable} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_mining.js';
import {attrs} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {FLUID_BASIN_RECIPES,FLUID_LOADER_RECIPES,FLUID_OBSIDIAN_RECIPE} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_fluids.js';
test('all listed processing recipes derive from the actual machine implementation',()=>{
 assert.equal(MACHINE_RECIPE_GROUPS.length,16);assert.equal(MACHINE_RECIPES.length,215);
 for(const r of MACHINE_RECIPES){
  if(r.kind==='mixer'||r.kind==='assembler'){
   assert.ok(LINE_RECIPES[r.kind].some(x=>x.output===r.out&&x.amount===r.count&&JSON.stringify(x.costs)===JSON.stringify(r.costs)));
  }else if(r.kind==='miner'){
   assert.equal(r.out,miningResult(r.block));assert.equal(r.count,1);assert.deepEqual(r.costs,[]);assert.ok(r.details.includes('鉱石は樽に入れません'));
  }else if(r.kind==='mobile_harvester'){
   const c=farmGuideCrops().find(c=>c.crop===r.crop);assert.ok(c);assert.equal(r.out,c.item);assert.equal(r.count,c.amount);assert.deepEqual(r.costs,[]);assert.ok(r.details.includes('移動後'));
  }else if(r.kind.startsWith('farm_')){
   const c=farmGuideCrops().find(c=>c.crop===r.crop);assert.ok(c);assert.equal(farmSeed(c.seed),c.crop);assert.equal(farmCrop(c.crop).item,c.item);
   if(r.kind==='farm_harvester'){assert.equal(r.out,c.item);assert.equal(r.count,c.amount);assert.equal(r.costs.length,0);}
   else if(r.kind==='farm_planter'){assert.equal(r.out,c.crop);assert.deepEqual(r.costs,[{id:c.seed,count:1}]);}
   else {assert.equal(r.kind,'farm_fertilizer');assert.equal(r.out,c.crop);assert.deepEqual(r.costs,[{id:'minecraft:bone_meal',count:1}]);}
  }else if(r.kind==='fluid_loader'||r.kind==='fluid_basin'){
   if(r.costs.length){const definitions=r.kind==='fluid_loader'?FLUID_LOADER_RECIPES:FLUID_BASIN_RECIPES;assert.ok(definitions.some(x=>x.input===r.costs[0].id&&x.output===r.out&&x.kind===r.fluids[0].kind&&x.units===r.fluids[0].units));}
   else {assert.equal(r.out,FLUID_OBSIDIAN_RECIPE.output);assert.deepEqual(r.fluids,[{kind:2,units:FLUID_OBSIDIAN_RECIPE.lava},{kind:1,units:FLUID_OBSIDIAN_RECIPE.water}]);}
  }else{
   const [out,need,count,aux]=factoryRecipe(r.kind,r.costs[0].id);
   assert.equal(r.out,out);assert.equal(r.count,count);assert.equal(r.costs[0].count,need);assert.deepEqual(r.costs.slice(1),aux?[{id:aux,count:1}]:[]);
  }
  assert.ok(r.details.includes(r.title.split('：')[0]));assert.ok(r.search.includes(r.out));
 }
 for(const id of Object.keys(RECYCLE_DROPS))assert.ok(MACHINE_RECIPES.some(r=>r.kind==='crusher'&&r.costs[0].id===id));
 for(const [kind,recipes] of Object.entries(LINE_RECIPES))assert.equal(MACHINE_RECIPES.filter(r=>r.kind===kind).length,recipes.length);
});
test('searches input, output, ID and machine names and explains conditions',()=>{
 assert.ok(searchMachineRecipes('洗浄済み 原鉄').some(r=>r.kind==='washer'));
 assert.ok(searchMachineRecipes('washed_iron').some(r=>r.kind==='mill'));
 assert.ok(searchMachineRecipes('minecraft:iron_ingot').some(r=>r.kind==='compressor'));
 assert.equal(searchMachineRecipes('ｍｉｎｅｃｒａｆｔ：ｒａｗ＿ｇｏｌｄ').length,4);
 assert.equal(searchMachineRecipes('  ').length,0);
 assert.ok(searchMachineRecipes('破砕機 drop_element_0').some(r=>r.kind==='crusher'));
 assert.ok(MACHINE_RECIPES.find(r=>r.kind==='washer').details.includes('水タンク'));
 assert.ok(MACHINE_RECIPES.find(r=>r.kind==='compressor'&&r.costs[0].id==='hakkai:shard_0').details.includes('minecraft:amethyst_shard'));
 assert.equal(searchMachineRecipes('minecraft:bucket').filter(r=>r.kind==='fluid_basin').length,2);
 assert.ok(searchMachineRecipes('黒曜石').some(r=>r.kind==='fluid_basin'&&r.details.includes('別タンク')));
 assert.ok(searchMachineRecipes('water_bucket').some(r=>r.kind==='fluid_loader'&&r.details.includes('注入')));
 assert.ok(searchMachineRecipes('red_concrete_powder').some(r=>r.out==='minecraft:red_concrete'));
 assert.ok(searchMachineRecipes('赤色 コンクリートパウダー').some(r=>r.out==='minecraft:red_concrete'));
 assert.ok(searchMachineRecipes('黒曜石 溶岩 水').some(r=>r.costs.length===0));
 assert.equal(searchMachineRecipes('風向きヒマワリ').filter(r=>r.kind.startsWith('farm_')).length,3);
 assert.ok(searchMachineRecipes('動力収穫機 夏陽').some(r=>r.out==='hakkai:summer_corn_produce'&&r.count===2));
 assert.ok(searchMachineRecipes('動力施肥機 骨粉').every(r=>r.details.includes('水1目盛り')));
 assert.equal(MINER_DEPTH,6);assert.equal(miningGuideTargets(attrs.length).length,26);
 assert.equal(searchMachineRecipes('採掘機').length,26);
 assert.ok(searchMachineRecipes('採掘機 深層鉄鉱石').some(r=>r.block==='minecraft:deepslate_iron_ore'&&r.out==='minecraft:raw_iron'));
 assert.ok(searchMachineRecipes('採掘機 風の結晶鉱').some(r=>r.block==='hakkai:ore_0'&&r.out==='hakkai:crystal_0'));
 assert.ok(searchMachineRecipes('採掘機 minecraft:copper_ore').some(r=>r.out==='minecraft:raw_copper'));
 assert.equal(miningResult('minecraft:diamond_ore'),undefined);assert.equal(miningResult('minecraft:nether_gold_ore'),undefined);
 assert.equal(miningPassable('minecraft:air'),true);assert.equal(miningPassable('minecraft:dirt'),false);
 assert.equal(searchMachineRecipes('可動収穫ヘッド').length,9);
 assert.ok(searchMachineRecipes('移動農機 夏陽').some(r=>r.out==='hakkai:summer_corn_produce'&&r.count===2&&r.details.includes('先行した収穫')));
 assert.notEqual(MACHINE_RECIPES.filter(r=>r.kind==='fluid_loader')[0].title,MACHINE_RECIPES.filter(r=>r.kind==='fluid_loader')[1].title);
});
test('actual recipe menu opens machine section without disturbing existing routes',async()=>{
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');const start=src.indexOf('async function openRecipeCatalog('),end=src.indexOf('async function guide(',start);assert.ok(start>0&&end>start);
 const p={isValid:true},calls=[],choices=[7,3,4];const ctx={form:async()=>choices.shift(),RECIPE_INDEX:[],openMachineCatalog:async()=>calls.push('machine'),openRecipeUses:async()=>calls.push('uses')};
 vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);await ctx.openRecipeCatalog(p);assert.deepEqual(calls,['machine','uses']);
});
test('actual machine menu searches and shows recipe details',async()=>{
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');const a=src.indexOf('async function openMachineResults('),b=src.indexOf('async function openRecipeCatalog(',a);assert.ok(a>0&&b>a);
 const p={isValid:true},forms=[MACHINE_RECIPE_GROUPS.length,MACHINE_RECIPE_GROUPS.length+1],selected=[{index:0,page:0},{back:true}],shown=[];
 const ctx={MACHINE_RECIPES,MACHINE_RECIPE_GROUPS,searchMachineRecipes,form:async()=>forms.shift(),recipeQuery:async()=> 'washed_iron',guideSelect:async()=>selected.shift(),simple:async(_p,title,body)=>shown.push({title,body})};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);await ctx.openMachineCatalog(p);
 assert.equal(shown.length,1);assert.ok(shown[0].body.includes('hakkai:washed_iron'));assert.ok(shown[0].body.includes('入力樽'));
});

test('real menu opens fluid group and shows tank costs',async()=>{
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');const a=src.indexOf('async function openMachineResults('),b=src.indexOf('async function openRecipeCatalog(',a);
 const p={isValid:true},index=MACHINE_RECIPE_GROUPS.findIndex(g=>g.kind==='fluid_basin'),forms=[index,MACHINE_RECIPE_GROUPS.length+1],chosen=[{index:20,page:0},{back:true}],shown=[];
 const ctx={MACHINE_RECIPES,MACHINE_RECIPE_GROUPS,searchMachineRecipes,form:async()=>forms.shift(),guideSelect:async()=>chosen.shift(),simple:async(_p,title,body)=>shown.push({title,body})};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);await ctx.openMachineCatalog(p);
 assert.equal(shown.length,1);assert.ok(shown[0].title.includes('黒曜石'));assert.ok(shown[0].body.includes('別タンク'));assert.ok(shown[0].body.includes('4目盛り'));
});
test('real menu opens agricultural actions without calling them inventory outputs',async()=>{
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');const a=src.indexOf('async function openMachineResults('),b=src.indexOf('async function openRecipeCatalog(',a);
 const p={isValid:true},index=MACHINE_RECIPE_GROUPS.findIndex(g=>g.kind==='farm_planter'),forms=[index,MACHINE_RECIPE_GROUPS.length+1],chosen=[{index:0,page:0},{back:true}],shown=[];
 const ctx={MACHINE_RECIPES,MACHINE_RECIPE_GROUPS,searchMachineRecipes,form:async()=>forms.shift(),guideSelect:async()=>chosen.shift(),simple:async(_p,title,body)=>shown.push({title,body})};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);await ctx.openMachineCatalog(p);
 assert.equal(shown.length,1);assert.ok(shown[0].title.includes('播種機'));assert.ok(shown[0].body.includes('樽に出力するレシピではありません'));assert.ok(shown[0].body.includes('小麦の種'));
});

test('real menu opens mobile harvest actions with controller and failure guidance',async()=>{
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');const a=src.indexOf('async function openMachineResults('),b=src.indexOf('async function openRecipeCatalog(',a);
 const p={isValid:true},index=MACHINE_RECIPE_GROUPS.findIndex(g=>g.kind==='mobile_harvester'),forms=[index,MACHINE_RECIPE_GROUPS.length+1],chosen=[{index:0,page:0},{back:true}],shown=[],prompts=[];
 const ctx={MACHINE_RECIPES,MACHINE_RECIPE_GROUPS,searchMachineRecipes,form:async(_p,title,body)=>{prompts.push(body);return forms.shift();},guideSelect:async()=>chosen.shift(),simple:async(_p,title,body)=>shown.push({title,body})};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);await ctx.openMachineCatalog(p);
 assert.equal(shown.length,1);assert.ok(shown[0].title.includes('可動収穫ヘッド'));assert.ok(shown[0].body.includes('真上の出力樽'));assert.ok(shown[0].body.includes('移動後の処理失敗'));assert.ok(prompts[0].includes('可動収穫'));assert.ok(!prompts[0].includes('移動農機は工業ガイド'));
});

test('actual machine menu lists miner actions with block, fixed output and stops',async()=>{
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');const a=src.indexOf('async function openMachineResults('),b=src.indexOf('async function openRecipeCatalog(',a);
 const p={isValid:true},index=MACHINE_RECIPE_GROUPS.findIndex(g=>g.kind==='miner'),forms=[index,MACHINE_RECIPE_GROUPS.length+1],chosen=[{index:0,page:0},{back:true}],shown=[],prompts=[];
 const ctx={MACHINE_RECIPES,MACHINE_RECIPE_GROUPS,searchMachineRecipes,form:async(_p,_title,body)=>{prompts.push(body);return forms.shift();},guideSelect:async()=>chosen.shift(),simple:async(_p,title,body)=>shown.push({title,body})};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);await ctx.openMachineCatalog(p);
 assert.equal(shown.length,1);assert.ok(shown[0].body.includes('hakkai:ore_0'));assert.ok(shown[0].body.includes('鉱石は樽に入れません'));assert.ok(shown[0].body.includes('幸運やシルクタッチ'));assert.ok(prompts[0].includes('採掘'));
});
test('miner guide names and custom targets correspond to actual pack language entries',()=>{
 const lang=fs.readFileSync('Hakkai_v7.1.0/ResourcePack/texts/ja_JP.lang','utf8');
 for(const row of MACHINE_RECIPES.filter(r=>r.kind==='miner'&&r.block.startsWith('hakkai:'))){
  const index=Number(row.block.slice('hakkai:ore_'.length));assert.ok(lang.includes(`tile.hakkai:ore_${index}.name=${attrs[index]}の結晶鉱`));
  assert.ok(lang.includes(`item.hakkai:crystal_${index}.name=${attrs[index]}の結晶`));assert.ok(row.title.includes(`${attrs[index]}の結晶鉱`));
 }
});
test('extracted miner matcher preserves the previous patterns, including unsupported IDs',()=>{
 const legacy=(id,ns='hakkai:')=>{const special=id.match(/^hakkai:ore_(\d+)$/),normal=id.match(/^minecraft:(?:deepslate_)?(iron|copper|gold)_ore$/);return special?ns+`crystal_${special[1]}`:normal?`minecraft:raw_${normal[1]}`:undefined;};
 for(const id of [...miningGuideTargets(attrs.length).map(x=>x.block),'minecraft:gold_ore','minecraft:nether_gold_ore','minecraft:diamond_ore','hakkai:ore_999','hakkai:ore_09','other:ore_0','hakkai:ore_-1','minecraft:iron_ore_extra'])assert.equal(miningResult(id),legacy(id),id);
 assert.equal(miningResult('hakkai:ore_0','custom:'),legacy('hakkai:ore_0','custom:'));
 for(const id of ['minecraft:air','minecraft:stone','minecraft:deepslate','minecraft:tuff','minecraft:granite','minecraft:andesite','minecraft:diorite','minecraft:netherrack','minecraft:water','minecraft:dirt','minecraft:diamond_ore','hakkai:ore_0'])assert.equal(miningPassable(id),id==='minecraft:air'||/^minecraft:(stone|deepslate|tuff|granite|andesite|diorite|netherrack)$/.test(id),id);
});
