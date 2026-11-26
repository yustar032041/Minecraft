import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {catalog} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {seriesLegUpgrade} from '../Hakkai_v7.1.0/BehaviorPack/scripts/armor_series.js';
import {armorRecipe} from '../Hakkai_v7.1.0/BehaviorPack/scripts/armor_guide.js';
import {RECIPE_INDEX} from '../Hakkai_v7.1.0/BehaviorPack/scripts/recipe_index.js';
const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const a=source.indexOf('async function nextHeldGearRecipe('),b=source.indexOf('async function survivalGuide(',a);assert.ok(a>0&&b>a);
const calls=[];let held;const ctx={ns:'hakkai:',selected:()=>held,gear:new Map(catalog.map(g=>['hakkai:'+g.id,g])),catalog,seriesLegUpgrade,armorRecipe,RECIPE_INDEX,simple:async(_p,title,body)=>calls.push({title,body}),ownsArmorPiece:(_p,id)=>id==='gear_161'};vm.createContext(ctx);vm.runInContext(source.slice(a,b),ctx);
test('each leg chain and all catalog progression routes show actual recipes, without transactions',async()=>{
 for(let i=0;i<11;i++){
  const id=`series_leggings_${String(i).padStart(2,'0')}`,link=seriesLegUpgrade(id,catalog);held={typeId:'hakkai:'+id};await ctx.nextHeldGearRecipe({});
  const body=calls.at(-1).body;assert.ok(body.includes(link.current.label));
  if(link.next){assert.ok(body.includes(link.next.label));assert.ok(body.includes(`hakkai:${link.next.id}`));assert.ok(body.includes('素材を消費しません'));}else assert.ok(body.includes('次段階の通常レシピはありません'));
 }
 for(const next of catalog.filter(g=>g.prev)){
  held={typeId:'hakkai:'+next.prev};await ctx.nextHeldGearRecipe({});assert.ok(calls.at(-1).body.includes(`hakkai:${next.id}`),next.id);
 }
 assert.equal(seriesLegUpgrade('series_leggings_11',catalog),undefined);
});
test('missing, terminal and special nightwalker are explained without consuming anything',async()=>{
 for(const typeId of [undefined,'minecraft:iron_sword','hakkai:ult_sword']){held=typeId?{typeId}:undefined;await ctx.nextHeldGearRecipe({});assert.ok(calls.at(-1).body.includes('対象の風記装備を手に持って'))}
 held={typeId:'hakkai:gear_186'};await ctx.nextHeldGearRecipe({});assert.ok(calls.at(-1).body.includes('覚醒試練'));
 held={typeId:'hakkai:gear_161'};await ctx.nextHeldGearRecipe({});assert.ok(calls.at(-1).body.includes('次段階の通常レシピはありません'));
 assert.ok(!source.includes('async function enhanceHeldGear('));assert.ok(!source.includes('gear_evolution_count'));assert.ok(!source.includes('gear_evolution_rank'));
});
test('stage guide is explicitly current ownership, not fake crafting history',async()=>{
 await ctx.gearEvolutionChronicle({});const body=calls.at(-1).body;assert.ok(body.includes('1種'));assert.ok(body.includes('現在所持または装備中'));assert.ok(body.includes('製作回数や過去に所持した記録ではありません'));assert.ok(body.includes('通常の作業台'));
});
