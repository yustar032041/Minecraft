import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {sortCombatFamilies,gearKinds,filterGear} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guide_navigation.js';
import {catalog,attrs} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {armorRecipe} from '../Hakkai_v7.1.0/BehaviorPack/scripts/armor_guide.js';
import {RECIPE_INDEX} from '../Hakkai_v7.1.0/BehaviorPack/scripts/recipe_index.js';
test('combat kind sort puts each evolution chain together without mutating or changing other filters',()=>{
 for(const kind of ['剣','斧','弓','杖','ハンマー','槍','盾','扇','指輪','首飾り','本','石']){
  const original=filterGear(catalog,'kind',kind),copy=[...original],sorted=sortCombatFamilies(original);assert.deepEqual(original,copy);assert.equal(sorted.length,original.length);assert.deepEqual(new Set(sorted),new Set(original));
  const root=g=>(Number(g.number)-1)%80;
  for(let i=1;i<sorted.length;i++)assert.ok(root(sorted[i-1])<root(sorted[i])||(root(sorted[i-1])===root(sorted[i])&&sorted[i-1].rank<sorted[i].rank));
 }
 const armor=filterGear(catalog,'kind','鎧');assert.equal(sortCombatFamilies(armor),armor);assert.deepEqual(sortCombatFamilies([]),[]);
 assert.equal(filterGear(catalog,'number',0)[0].id,'gear_001');
});
test('real weapon details form lists progression order and shows actual JSON and ordinary crafting instructions',async()=>{
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8'),a=src.indexOf('async function details('),b=src.indexOf('function unlocked(',a);assert.ok(a>0&&b>a);
 const seen=[],ctx={catalog,attrs,gearKinds,filterGear,sortCombatFamilies,armorRecipe,RECIPE_INDEX,gearTrialNote:()=>'',itemTexture:id=>id,form:async()=>0,guideSelect:async(_p,title,_body,rows)=>{seen.push({title,rows});return {index:seen.length===1?0:1}},simple:async(_p,title,body)=>seen.push({title,body})};vm.createContext(ctx);vm.runInContext(src.slice(a,b)+';this.open=details;',ctx);await ctx.open({isValid:true});
 assert.match(seen[1].rows[0][0],/^001\s/);assert.match(seen[1].rows[1][0],/^081\s/);assert.match(seen[1].rows[2][0],/^161\s/);assert.ok(seen[2].title.endsWith('II'));assert.ok(seen[2].body.includes('hakkai:gear_001'));assert.ok(seen[2].body.includes('通常の作業台画面'));assert.ok(seen[2].body.includes('引き継がれません'));assert.ok(!seen[2].body.includes('前段階なし'));
 assert.ok(!src.includes('function forgeGear('));assert.ok(!src.includes('function baseWeapon('));
});

test('ordinary crafting table interaction is not intercepted for paper or vanilla weapons',()=>{
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8'),a=src.indexOf("safeSub('world','before','playerInteractWithBlock'"),b=src.indexOf('async function returnMenu(',a);assert.ok(a>0&&b>a);
 let handler;const ctx={safeSub:(_r,_w,_n,fn)=>handler=fn,state:()=>({}),GameMode:{Spectator:'spectator'},system:{currentTick:20},vanillaSword:()=>false,menu:()=>assert.fail('ordinary crafting must not open an addon menu')};vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);
 for(const id of ['minecraft:paper','minecraft:iron_sword','minecraft:iron_axe','minecraft:bow']){const event={isFirstEvent:true,player:{isSneaking:true,getGameMode:()=> 'survival'},block:{typeId:'minecraft:crafting_table',location:{x:0,y:0,z:0},dimension:{id:'minecraft:overworld'}},itemStack:{typeId:id},cancel:false};handler(event);assert.equal(event.cancel,false,id);}
});
test('magic tools explain hand use rather than claiming wearable equipment',async()=>{
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8'),a=src.indexOf('async function details('),b=src.indexOf('function unlocked(',a),seen=[];
 const ctx={catalog,attrs,gearKinds,filterGear,sortCombatFamilies,armorRecipe,RECIPE_INDEX,gearTrialNote:()=>'',itemTexture:id=>id,form:async()=>0,guideSelect:async(_p,title,_body,rows)=>{seen.push({title,rows});return {index:seen.length===1?gearKinds(catalog).indexOf('指輪'):0}},simple:async(_p,title,body)=>seen.push({title,body})};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b)+';this.open=details;',ctx);await ctx.open({isValid:true});assert.ok(seen[2].title.includes('魔環'));assert.ok(seen[2].body.includes('手に持って使う'));assert.ok(seen[2].body.includes('装着する装飾品ではありません'));
 for(const kind of ['指輪','首飾り','本','石'])for(const g of catalog.filter(x=>x.kind===kind)){const d=JSON.parse(fs.readFileSync(`Hakkai_v7.1.0/BehaviorPack/items/${g.id}.json`))['minecraft:item'].components;assert.ok(d['hakkai:use']);assert.equal(d['minecraft:wearable'],undefined);}
 assert.ok(src.includes("const g=gear.get(id);if(g){"));assert.ok(src.includes('cast(p,g);'));
});
