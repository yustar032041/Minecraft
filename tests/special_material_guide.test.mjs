import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {SPECIAL_MATERIALS,searchSpecialMaterials} from '../Hakkai_v7.1.0/BehaviorPack/scripts/special_material_guide.js';
import {attrs,places} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {realmOres} from '../Hakkai_v7.1.0/BehaviorPack/scripts/ore_distribution.js';
import {factoryRecipe} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_network.js';
import {MACHINE_RECIPES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/machine_recipe_guide.js';
const bp='Hakkai_v7.1.0/BehaviorPack',src=fs.readFileSync(`${bp}/scripts/main.js`,'utf8');
const read=p=>JSON.parse(fs.readFileSync(`${bp}/${p}`,'utf8'));
const entry=id=>SPECIAL_MATERIALS.find(row=>row[0]===id);
test('34 supplemental paths name actual custom definitions and accurately identify 20 ore loot and regions',()=>{
 assert.equal(SPECIAL_MATERIALS.length,34);assert.equal(new Set(SPECIAL_MATERIALS.map(x=>x[0])).size,34);
 for(const [id,label,details] of SPECIAL_MATERIALS){const short=id.slice(7),kind=short.startsWith('ore_')?'blocks':'items',def=read(`${kind}/${short}.json`)[kind==='blocks'?'minecraft:block':'minecraft:item'];
  assert.equal(def.description.identifier,id);assert.ok(label.includes(id));assert.ok(details.includes('実機'));assert.equal(searchSpecialMaterials(id)[0]?.[0],id);
 }
 for(let i=0;i<20;i++){
  const r=entry(`hakkai:ore_${i}`),realm=realmOres.findIndex(group=>group.includes(i)),block=read(`blocks/ore_${i}.json`)['minecraft:block'];
  const table=read(block.components['minecraft:loot']);assert.equal(table.pools[0].entries[0].name,`hakkai:crystal_${i}`);
  assert.ok(r[1].includes(attrs[i]));assert.ok(r[2].includes(places[realm+1].name));assert.ok(MACHINE_RECIPES.some(x=>x.kind==='miner'&&x.block===r[0]&&x.out===`hakkai:crystal_${i}`));
 }
});
test('ore intermediate guides match all real crusher, washer and mill output IDs and quantities',()=>{
 for(const [metal,label] of [['iron','鉄'],['gold','金'],['copper','銅']]){
  const [crushed,consume,produced]=factoryRecipe('crusher',`minecraft:raw_${metal}`),[washed,washIn,washOut]=factoryRecipe('washer',crushed),[ingot,millIn,millOut]=factoryRecipe('mill',washed);
  assert.equal(consume,1);assert.equal(produced,2);assert.equal(washIn,1);assert.equal(washOut,1);assert.equal(millIn,1);assert.equal(millOut,1);assert.equal(ingot,`minecraft:${metal}_ingot`);
  assert.ok(entry(crushed)[2].includes(`原${label} ×${consume} → 砕いた原${label} ×${produced}`));assert.ok(entry(washed)[2].includes(`${label}インゴット ×${millOut}`));
 }
});
test('fish and rune supplement matches actual menu constants and ids',()=>{
 const rStart=src.indexOf('const runes=['),rEnd=src.indexOf('const vanillaSword=',rStart),runeCtx={};vm.createContext(runeCtx);vm.runInContext(src.slice(rStart,rEnd)+'\nthis.values=runes;',runeCtx);
 const fish=src.match(/const fishNames=\[([^\]]+)\]/);assert.ok(fish);const names=vm.runInNewContext(`[${fish[1]}]`);
 for(let i=0;i<4;i++){
  assert.ok(entry(`hakkai:festival_fish_${i}`)[1].startsWith(names[i]));
  const r=runeCtx.values[i],page=entry(`hakkai:rune_book_${i}`);assert.ok(page[1].startsWith(r.name));assert.ok(page[2].includes(attrs[r.a]+'の結晶2個'));assert.ok(page[2].includes('持ち物から'));
 }
 assert.ok(src.includes('ns+`festival_fish_${seasons.indexOf(era())}`'));assert.ok(src.includes("ns+`festival_fish_${choice}`,1,ns+'crystal_19'"));assert.ok(src.includes('ns+`crystal_${runes[i].a}`'));assert.ok(src.includes('ns+`rune_book_${i}`'));
 assert.ok(!src.includes('エンチャント台を使うと手持ちの剣に写せます'));
});
test('search is bounded, case-insensitive, literal, and supports Japanese and IDs',()=>{
 assert.equal(searchSpecialMaterials('ore_0')[0][0],'hakkai:ore_0');assert.equal(searchSpecialMaterials('RUNE_BOOK_2')[0][0],'hakkai:rune_book_2');assert.equal(searchSpecialMaterials('湖の結晶鉱')[0][0],'hakkai:ore_19');assert.equal(searchSpecialMaterials('祭り魚').length,4);assert.equal(searchSpecialMaterials('祭り魚 冬')[0][0],'hakkai:festival_fish_3');assert.equal(searchSpecialMaterials('鉱石').length,20);assert.equal(searchSpecialMaterials('原鉱 鉄').length,2);assert.equal(searchSpecialMaterials('.*').length,0);assert.equal(searchSpecialMaterials('  ').length,0);
});
test('actual menu reaches new section, existing machine and recipe routes, and search result',async()=>{
 const a=src.indexOf('async function openSpecialMaterialCatalog('),b=src.indexOf('async function guide(p)',a);assert.ok(a>0&&b>a);
 const choices=[8,1,2,7,3,4],calls=[],shown=[],p={isValid:true};
 const ctx={SPECIAL_MATERIALS,searchSpecialMaterials,RECIPE_INDEX:[],form:async()=>choices.shift(),recipeQuery:async()=> 'rune_book_2',openRecipeResults:async(_p,rows,title)=>shown.push([rows,title]),openMachineCatalog:async()=>calls.push('machine'),openRecipeUses:async()=>calls.push('uses'),simple:async()=>assert.fail('unexpected empty')};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);await ctx.openRecipeCatalog(p);assert.deepEqual(calls,['machine','uses']);assert.equal(shown.length,1);assert.equal(shown[0][0][0][0],'hakkai:rune_book_2');assert.ok(shown[0][1].includes('1件'));
});
test('actual special menu handles blank, missing, cancellation, list and return',async()=>{
 const a=src.indexOf('async function openSpecialMaterialCatalog('),b=src.indexOf('async function openRecipeCatalog(',a),p={isValid:true},choices=[1,1,1,0,2],queries=[' ','.*',undefined],messages=[],listed=[];
 const ctx={SPECIAL_MATERIALS,searchSpecialMaterials,form:async()=>choices.shift(),recipeQuery:async()=>queries.shift(),simple:async(_p,t,b)=>messages.push([t,b]),openRecipeResults:async(_p,r)=>listed.push(r)};vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);await ctx.openSpecialMaterialCatalog(p);
 assert.equal(messages.length,2);assert.ok(messages[0][1].includes('入力'));assert.ok(messages[1][1].includes('ありません'));assert.equal(listed[0].length,34);
});
