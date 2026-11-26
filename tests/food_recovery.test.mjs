// These simulate custom-component callbacks; they do not emulate Bedrock's
// native eating, event delivery, creative consumption or hunger rules.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {GameMode} from '@minecraft/server';
import {isRecoveryFood,applyFoodRecovery} from '../Hakkai_v7.1.0/BehaviorPack/scripts/food_recovery.js';

const values={trail_ration:[35,0],camp_stew:[50,10],dried_meat:[18,0],preserved_ration:[35,5],spring_garden_soup:[25,8],summer_corn_stew:[30,5],autumn_squash_potage:[28,8],frost_blossom_tea:[22,15],sunflower_trail_bowl:[32,5],spring_water_flask:[10,4],camp_herbal_tea:[14,8],gathered_herb_bundle:[8,4],roasted_root_plate:[24,3],forest_trail_meal:[30,12],camp_mushroom_wrap:[26,6],forager_nut_mix:[20,10],dried_sweet_berries:[12,0],smoked_fish_strip:[16,2],expedition_bento:[38,8],camp_supply_pack:[44,14]};
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const start=src.indexOf('function use(e){');
const useCode=src.slice(start,src.indexOf('system.runInterval(()=>{',start));
const registration=src.split('\n').find(x=>x.includes("safeReg(itemComponentRegistry,ns+'use'"));
assert.ok(useCode.startsWith('function use(e){')&&registration);
function fixture(){
 const states=new Map(),notices=[],debits=[];
 const state=p=>{if(!states.has(p.id))states.set(p.id,{s:0,m:0,useTick:100,busy:true,menu:true});return states.get(p.id)};
 const ctx={GameMode,isRecoveryFood,applyFoodRecovery,state,notice:(p,msg)=>notices.push([p.id,msg]),max:100,system:{currentTick:100},gear:new Map(),ns:'hakkai:',itemComponentRegistry:{},safeReg:(_r,_n,def)=>{ctx.component=def},completeFocus:()=>{},isCreative:p=>p.getGameMode()===GameMode.Creative,useSelectedConsumable:(_p,id,creative,apply)=>{if(!creative)debits.push([id,1]);return apply()?'used':'failed'},bounds:(x,a,b)=>Math.min(b,Math.max(a,x))};
 vm.createContext(ctx);vm.runInContext(useCode+'\n'+registration,ctx);
 const player=(id='a',mode=GameMode.Survival)=>({id,typeId:'minecraft:player',isValid:true,getGameMode:()=>mode});
 return {ctx,state,notices,debits,player};
}
for(const [name,[s,m]] of Object.entries(values))test(`${name}: only consume callback restores original values`,()=>{
 const f=fixture(),p=f.player(),e={source:p,itemStack:{typeId:'hakkai:'+name}};
 // Start/use-on/complete without an actual consume event models interruption or
 // an eating attempt that the native engine does not allow.
 f.ctx.component.onUse(e);f.ctx.component.onUseOn(e);f.ctx.component.onCompleteUse(e);
 assert.deepEqual(f.state(p),{s:0,m:0,useTick:100,busy:true,menu:true});assert.equal(f.notices.length,0);
 f.ctx.component.onConsume(e);assert.equal(f.state(p).s,s);assert.equal(f.state(p).m,m);assert.equal(f.notices.length,1);
 assert.equal(f.state(p).useTick,100);assert.equal(f.debits.length,0);
});
test('table is exactly the food items bound to hakkai:use',()=>{
 const dir='Hakkai_v7.1.0/BehaviorPack/items';const found=[];
 for(const file of fs.readdirSync(dir).filter(x=>x.endsWith('.json'))){const item=JSON.parse(fs.readFileSync(`${dir}/${file}`,'utf8'))['minecraft:item'];if(item?.components?.['minecraft:food']&&item.components['hakkai:use']!==undefined){found.push(item.description.identifier.slice(7));assert.ok(item.components['minecraft:use_modifiers']);assert.equal(item.components['minecraft:food'].can_always_eat,false);}}
 assert.deepEqual(found.sort(),Object.keys(values).sort());
 assert.equal(isRecoveryFood('hakkai:__proto__'),false);assert.equal(isRecoveryFood('minecraft:trail_ration'),false);
});
test('per-player same-tick completion, cap, creative, adventure and changed selected item',()=>{
 const f=fixture(),a=f.player('a'),b=f.player('b',GameMode.Creative),c=f.player('c',GameMode.Adventure);
 Object.assign(f.state(a),{s:95,m:99});Object.assign(f.state(b),{s:1,m:2});
 for(const p of [a,b,c])f.ctx.component.onConsume({source:p,itemStack:{typeId:'hakkai:camp_stew'}});
 assert.equal(f.state(a).s,100);assert.equal(f.state(a).m,100);assert.equal(f.state(b).s,51);assert.equal(f.state(b).m,12);assert.equal(f.state(c).s,50);
 assert.deepEqual(f.notices.map(x=>x[0]),['a','b','c']);
});
test('invalid sources, non-food, spectators and inaccessible state fail closed',()=>{
 const f=fixture();for(const [source,id] of [[null,'hakkai:trail_ration'],[{id:'z',isValid:true,typeId:'minecraft:cow'},'hakkai:trail_ration'],[f.player('spectator',GameMode.Spectator),'hakkai:trail_ration'],[{...f.player('dead'),isValid:false},'hakkai:trail_ration'],[f.player(),'hakkai:mana_tonic'],[f.player(),undefined]])f.ctx.component.onConsume({source,itemStack:{typeId:id}});
 assert.equal(f.notices.length,0);assert.equal(applyFoodRecovery({source:f.player(),itemStack:{typeId:'hakkai:trail_ration'}},{state:()=>{throw Error('unloaded')},notice:()=>{},max:100}),false);
});
test('mana tonic remains a separate paid use transaction',()=>{
 const f=fixture(),p=f.player();Object.assign(f.state(p),{s:0,m:0,useTick:0,busy:false,menu:false});
 f.ctx.component.onUse({source:p,itemStack:{typeId:'hakkai:mana_tonic'}});
 assert.equal(f.state(p).m,45);assert.deepEqual(f.debits,[['hakkai:mana_tonic',1]]);
});
