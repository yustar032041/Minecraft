import {isRecoveryFood} from '../Hakkai_v7.1.0/BehaviorPack/scripts/food_recovery.js';
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {useKeepsake} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_aids.js';
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
function fixture(id){
 let held={typeId:id,amount:1},effect;const applied=[];
 const p={isValid:true,typeId:'minecraft:player',selectedSlotIndex:0,getGameMode:()=>0,getComponent:()=>({container:{getItem:()=>held}}),getEffect:()=>effect,addEffect:(...args)=>{applied.push(args);return {}}};
 return {p,applied,get held(){return held},setHeld:value=>held=value,setEffect:value=>effect=value};
}
for(const [id,effect,duration,cooldown] of [['hakkai:village_badge','resistance',160,1200],['hakkai:wind_legacy_memorial','night_vision',1200,2400]])test(`${id} can be reused, protects stronger effects and has personal cooldown`,()=>{
 const f=fixture(id),cd=new Map();
 for(const buff of [{amplifier:1,duration:1},{amplifier:0,duration}]){f.setEffect(buff);assert.equal(useKeepsake(f.p,id,cd,10),'already');assert.equal(cd.size,0)}
 f.setEffect({amplifier:0,duration:duration-1});assert.equal(useKeepsake(f.p,id,cd,10),'used');assert.deepEqual(f.applied,[[effect,duration,{amplifier:0,showParticles:false}]]);assert.equal(f.held.amount,1);
 f.setEffect(undefined);assert.equal(useKeepsake(f.p,id,cd,10+cooldown-1),'cooldown');assert.equal(useKeepsake(f.p,id,new Map(),11),'used','other player has own cooldown');assert.equal(useKeepsake(f.p,id,cd,10+cooldown),'used');
 f.setHeld({typeId:'other',amount:1});assert.equal(useKeepsake(f.p,id,cd,10+cooldown+1),'changed');f.p.isValid=false;assert.equal(useKeepsake(f.p,id,cd,10+cooldown+1),'invalid');
 const bad=fixture(id),badcd=new Map();bad.p.addEffect=()=>undefined;assert.equal(useKeepsake(bad.p,id,badcd,0),'used');assert.equal(badcd.size,1);assert.equal(bad.held.amount,1);badcd.clear();bad.p.getEffect=()=>{throw Error('invalid')};assert.equal(useKeepsake(bad.p,id,badcd,0),'failed');
});
test('real item handler dispatches keepsakes once, never while spectating',()=>{
 const st={useTick:-100,cd:new Map()},notices=[],system={currentTick:10},ctx={ns:'hakkai:',gear:new Map(),GameMode:{Spectator:9},state:()=>st,system,useKeepsake,notice:(_p,m)=>notices.push(m)};
 const a=src.indexOf('function use(e){'),b=src.indexOf('system.runInterval(()=>{',a);ctx.isRecoveryFood=isRecoveryFood;vm.createContext(ctx);vm.runInContext(src.slice(a,b)+';this.use=use;',ctx);
 const f=fixture('hakkai:village_badge');ctx.use({source:f.p,itemStack:f.held});assert.match(notices.at(-1),/耐性I/);assert.equal(f.applied.length,1);ctx.use({source:f.p,itemStack:f.held});assert.equal(f.applied.length,1);
 system.currentTick=20;ctx.use({source:f.p,itemStack:f.held});assert.match(notices.at(-1),/再使用/);f.p.getGameMode=()=>9;system.currentTick=2000;ctx.use({source:f.p,itemStack:f.held});assert.equal(f.applied.length,1);
});
test('awakening book opens only existing progression boards; cancellation and invalid player do nothing',async()=>{
 const a=src.indexOf('async function awakeningBookMenu('),b=src.indexOf('async function finalChronicle(',a);assert.ok(a>0&&b>a);
 for(const [choice,expected] of [[0,'realm'],[1,'ascend'],[2,'forge'],[3,'night'],[4,'final'],[5,undefined],[undefined,undefined],[-1,undefined]]){
  const calls=[],ctx={form:async()=>choice,realmAwakeningBoard:()=>calls.push('realm'),realmAscensionBoard:()=>calls.push('ascend'),guardianLegacyForge:()=>calls.push('forge'),nightwalkerAwakeningTrial:()=>calls.push('night'),finalAwakeningTrial:()=>calls.push('final')};
  ctx.isRecoveryFood=isRecoveryFood;vm.createContext(ctx);vm.runInContext(src.slice(a,b)+';this.open=awakeningBookMenu;',ctx);await ctx.open({isValid:true});assert.deepEqual(calls,expected?[expected]:[]);await ctx.open({isValid:false});assert.deepEqual(calls,expected?[expected]:[]);
 }
});
test('book handler rechecks the selected slot when the deferred menu opens',async()=>{
 const f=fixture('hakkai:awaken_book'),st={useTick:-100},queue=[],calls=[],system={currentTick:10};
 const ctx={ns:'hakkai:',gear:new Map(),GameMode:{Spectator:9},state:()=>st,system,selected:p=>p.getComponent('minecraft:inventory').container.getItem(0),menu:(p,fn)=>queue.push(()=>fn(p)),awakeningBookMenu:()=>calls.push('opened')};
 const a=src.indexOf('function use(e){'),b=src.indexOf('system.runInterval(()=>{',a);ctx.isRecoveryFood=isRecoveryFood;vm.createContext(ctx);vm.runInContext(src.slice(a,b)+';this.use=use;',ctx);
 ctx.use({source:f.p,itemStack:f.held});assert.equal(queue.length,1);f.setHeld({typeId:'minecraft:book'});await queue.shift()();assert.deepEqual(calls,[]);
 f.setHeld({typeId:'hakkai:awaken_book',amount:1});system.currentTick=20;ctx.use({source:f.p,itemStack:f.held});await queue.shift()();assert.deepEqual(calls,['opened']);assert.equal(f.held.amount,1);
});
