import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {catalog,attrs} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {gearKinds,filterGear,sortCombatFamilies,GUIDE_ENTRIES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guide_navigation.js';
import {armorRecipe} from '../Hakkai_v7.1.0/BehaviorPack/scripts/armor_guide.js';import {RECIPE_INDEX} from '../Hakkai_v7.1.0/BehaviorPack/scripts/recipe_index.js';
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const defs=src.slice(src.indexOf('const legendGearTrials=['),src.indexOf('async function legendGearTrialBoard('));
const helper=src.slice(src.indexOf('function gearTrialNote('),src.indexOf('/** @param',src.indexOf('function gearTrialNote(')));
test('all 175 catalog items have recipes and only actual one-time exceptions are described',async()=>{
 for(const g of catalog)assert.ok(armorRecipe(RECIPE_INDEX,g.id),g.id);
 const ctx={realmRanks:Array.from({length:8},(_,i)=>[i,`ランク${i}`])};vm.createContext(ctx);vm.runInContext(defs+'\n'+helper+'\nthis.note=gearTrialNote;this.trials=legendGearTrials;',ctx);
 assert.equal(ctx.trials.length,8);for(const [realm,,id,rank] of ctx.trials){assert.ok(armorRecipe(RECIPE_INDEX,id));assert.ok(ctx.note(id).includes(realm));assert.ok(ctx.note(id).includes(`ランク${rank}`));assert.ok(ctx.note(id).includes('前段階の装備は必要ありません'))}
 assert.ok(ctx.note('gear_186').includes('装備セット試練'));for(const g of catalog.filter(g=>!ctx.trials.some(x=>x[2]===g.id)&&g.id!=='gear_186'))assert.equal(ctx.note(g.id),'',g.id);
 assert.equal(GUIDE_ENTRIES[16],'装備の作り方と試練');assert.ok(!/prizeExchange|prizeKind|gear_prize/.test(src));
});
test('actual acquisition guide routes and cancellation never exchange items',async()=>{
 const a=src.indexOf('async function gearAcquisitionGuide('),b=src.indexOf('const townCache=',a);assert.ok(a>0&&b>a);
 for(const [choice,expected] of [[0,'details'],[1,'legend'],[2,'set'],[3,undefined],[undefined,undefined],[-1,undefined]]){
  const calls=[],ctx={form:async()=>choice,details:()=>calls.push('details'),legendGearTrialBoard:()=>calls.push('legend'),armorSetTrial:()=>calls.push('set')};vm.createContext(ctx);vm.runInContext(src.slice(a,b)+';this.open=gearAcquisitionGuide;',ctx);await ctx.open({isValid:true});assert.deepEqual(calls,expected?[expected]:[]);
 }
});
test('actual detail screen labels the retained trial and no fabricated order on a regular weapon',async()=>{
 for(const target of ['gear_001','gear_170','gear_186']){
  const calls=[],g=catalog.find(x=>x.id===target),ctx={catalog,attrs,gearKinds,filterGear,sortCombatFamilies,armorRecipe,RECIPE_INDEX,realmRanks:Array.from({length:8},(_,i)=>[i,`ランク${i}`]),itemTexture:id=>id,form:async()=>0,guideSelect:async(_p,_title,_body,rows)=>{calls.push(rows);return {index:calls.length===1?gearKinds(catalog).indexOf(g.kind):rows.findIndex(r=>r[0].startsWith(g.number+'　'))}},simple:async(_p,title,body)=>calls.push({title,body})};
  const a=src.indexOf('async function details('),b=src.indexOf('function unlocked(',a);vm.createContext(ctx);vm.runInContext(defs+'\n'+helper+'\n'+src.slice(a,b)+';this.open=details;',ctx);await ctx.open({isValid:true});const body=calls.at(-1).body;assert.ok(body.includes('作業台レシピ'));assert.ok(!body.includes('注文'));
  assert.equal(body.includes('別の入手方法'),target!=='gear_001');
 }
});
