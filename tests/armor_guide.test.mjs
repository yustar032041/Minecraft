import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {armorRecipe,armorEffectName,armorPieceLines,armorSeriesSummary,ultimateArmorSummary,ULTIMATE_ARMOR_IDS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/armor_guide.js';
import {RECIPE_INDEX} from '../Hakkai_v7.1.0/BehaviorPack/scripts/recipe_index.js';

test('all armor series recipes and effect labels are connected to actual pack data',()=>{
 const main=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 const part=main.slice(main.indexOf('const armorSetDefs='),main.indexOf('function equippedSetParts('));
 const ctx={};vm.createContext(ctx);vm.runInContext(part+'\nthis.sets=armorSetDefs;this.bonuses=armorSetBonusDefs;',ctx);
 assert.equal(ctx.sets.length,11);assert.equal(ctx.bonuses.length,11);
 for(let i=0;i<11;i++){
  const [name,...fields]=ctx.sets[i],ids=fields.slice(0,4),bonus=ctx.bonuses[i];
  assert.equal(bonus[0],name);assert.deepEqual([...bonus.slice(1,5)],ids);
  assert.notEqual(armorEffectName(bonus[5]),bonus[5]);
  for(const id of ids){const row=armorRecipe(RECIPE_INDEX,id);assert.ok(row,id);assert.equal(row[0],0);assert.ok(row[2].includes(`完成：${row[1]}`));}
  const summary=armorSeriesSummary(RECIPE_INDEX,ids,bonus[5],3,false);
  assert.ok(summary.includes('それぞれ対応するスロット'));assert.ok(summary.includes('3/4'));assert.ok(summary.includes('約5秒'));
  for(const id of ids)assert.ok(summary.includes(`hakkai:${id}`));
 }
 for(const id of ULTIMATE_ARMOR_IDS){assert.ok(armorRecipe(RECIPE_INDEX,id));assert.equal(armorRecipe(RECIPE_INDEX,id)[0],0);}
 assert.ok(ultimateArmorSummary(RECIPE_INDEX,true).includes('1.2倍'));assert.ok(ultimateArmorSummary(RECIPE_INDEX,false).includes('4部位そろっていません'));
 assert.ok(ultimateArmorSummary(RECIPE_INDEX,true).includes('通常ダッシュ自体はスタミナを消費しません'));assert.ok(ultimateArmorSummary(RECIPE_INDEX,true).includes('ネザライトの欠片'));
 assert.equal(armorRecipe(RECIPE_INDEX,'gear_01'),undefined);
 assert.equal(armorPieceLines([],['missing']).includes('hakkai:missing'),true);
});

test('real armor forms show each recipe, return to its list, and close safely',async()=>{
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 const defs=src.slice(src.indexOf('const armorSetDefs='),src.indexOf('function equippedSetParts('));
 const page=src.slice(src.indexOf('async function armorCollectionArchive('),src.indexOf('async function armorSetTrial('));
 let responses=[0,3,4,5,0,4,15,0,4,16],calls=[];
 const p={isValid:true};
 const ctx={gearTrialNote:()=>'',RECIPE_INDEX,armorRecipe,armorSeriesSummary,ultimateArmorSummary,ULTIMATE_ARMOR_IDS,
  ownsArmorPiece:()=>false,equippedSetParts:()=>({active:false}),hasUltimateArmor:()=>false,space:()=>({}),
  form:async (_p,title,body,rows)=>{calls.push({title,body,rows});return responses.shift()},simple:async (_p,title,body)=>calls.push({title,body}),
  nextHeldGearRecipe:()=>assert.fail(),armorSetTrial:()=>assert.fail()};
 vm.createContext(ctx);vm.runInContext(defs+'\n'+page+'\nthis.open=armorProgressBoard;',ctx);await ctx.open(p);
 assert.deepEqual(Array.from(calls[0].rows.slice(0,5),row=>row[0].split('｜')[0]),['◇ 霧銀装 I','◇ 霧銀装 II','◇ 霧銀装 III','◇ 深影装 I','◇ 深影装 II']);
 assert.equal(responses.length,0);assert.equal(calls.filter(x=>x.title==='八界の装備収集帳').length,4);
 assert.ok(calls.some(x=>x.body.includes('hakkai:series_leggings_00')&&x.body.includes('並べ方は自由')));
 assert.ok(calls.some(x=>x.body.includes('hakkai:gear_042')&&x.body.includes('並べ方')));
 assert.ok(calls.some(x=>x.body.includes('hakkai:ult_chest')&&x.body.includes('並べ方')));
 assert.ok(calls.some(x=>x.title==='終刻の防具一式'&&x.body.includes('1.2倍')));
});
