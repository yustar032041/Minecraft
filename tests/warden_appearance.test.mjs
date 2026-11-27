import assert from 'node:assert/strict';
import {updateWardenAppearance,cancelWardenFlight} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_appearance.js';
import {setupWardenBoss as realSetupWardenBoss} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_boss.js';
import {legacyWardenDecision} from './warden_legacy_decision.mjs';
const setupWardenBoss=options=>realSetupWardenBoss({...options,decision:legacyWardenDecision()});
import {Difficulty,GameMode} from '@minecraft/server';
function fixture(){
 const props=[],effects=[],removes=[];
 const dim={id:'hakkai:warden_arena',isChunkLoaded:()=>true,getBlock:()=>({isAir:true}),getPlayers:()=>[]};
 const e={id:'boss',isValid:true,typeId:'hakkai:time_warden',isOnGround:true,location:{x:0,y:80,z:0},dimension:dim,setProperty:(k,v)=>props.push([k,v]),addEffect:(...v)=>effects.push(v),removeEffect:v=>removes.push(v)};
 return {e,s:{},dim,props,effects,removes};
}
{
 const f=fixture();assert.equal(updateWardenAppearance(f.e,f.s,1,0,{idle:true}),false);assert.deepEqual(f.props,[['hakkai:form',1],['hakkai:flying',false]]);
 assert.equal(updateWardenAppearance(f.e,f.s,1,99,{idle:true}),false);assert.equal(updateWardenAppearance(f.e,f.s,1,100,{idle:true}),true);
 assert.deepEqual(f.effects.map(x=>x[0]),['slow_falling','levitation']);assert.equal(f.props.at(-1)[1],false,'no wings while still on floor');
 f.e.isOnGround=false;assert.equal(updateWardenAppearance(f.e,f.s,1,101),true);assert.deepEqual(f.props.at(-1),['hakkai:flying',true]);
 f.e.isOnGround=true;assert.equal(updateWardenAppearance(f.e,f.s,1,115),false);assert.deepEqual(f.props.at(-1),['hakkai:flying',false]);assert.ok(f.removes.includes('levitation'));
 updateWardenAppearance(f.e,f.s,3,116);assert.deepEqual(f.props.at(-1),['hakkai:form',3]);
}
// Safe start requires a loaded, empty flight column and no player in it.
for(const reason of ['blocked','unloaded','player','outside','no-ground','busy','peaceful']){
 const f=fixture();if(reason==='blocked')f.dim.getBlock=()=>({isAir:false});if(reason==='unloaded')f.dim.isChunkLoaded=()=>false;
 if(reason==='player')f.dim.getPlayers=()=>[{isValid:true,location:{x:0,y:85,z:0}}];if(reason==='outside')f.e.location.x=14;if(reason==='no-ground')f.e.isOnGround=false;
 updateWardenAppearance(f.e,f.s,1,0);const result=updateWardenAppearance(f.e,f.s,1,100,{idle:reason!=='busy',peaceful:reason==='peaceful'});
 assert.equal(result,false,reason);assert.deepEqual(f.effects,[],reason);
}
// A centre block cannot slip between the clearance column's corner samples.
{
 const f=fixture();f.e.location.x=.5;f.e.location.z=.5;f.dim.getBlock=at=>({isAir:!(at.x===0&&at.z===0&&at.y===84)});
 updateWardenAppearance(f.e,f.s,1,0);assert.equal(updateWardenAppearance(f.e,f.s,1,100,{idle:true}),false);assert.equal(f.effects.length,0);
}
// Phase change and stagger cancel levitation, keep wings while actually airborne,
// and block new warnings until landing; synced properties recover on reload.
{
 const f=fixture();updateWardenAppearance(f.e,f.s,1,0);updateWardenAppearance(f.e,f.s,1,100,{idle:true});f.e.isOnGround=false;
 assert.equal(updateWardenAppearance(f.e,f.s,2,101,{idle:true}),true);assert.deepEqual(f.props.slice(-2),[['hakkai:form',2],['hakkai:flying',true]]);assert.equal(f.removes.length,1);
 assert.equal(updateWardenAppearance(f.e,f.s,2,102,{idle:true}),true);assert.equal(f.removes.length,1);
 f.e.isOnGround=true;assert.equal(updateWardenAppearance(f.e,f.s,2,115,{idle:true}),false);assert.deepEqual(f.props.at(-1),['hakkai:flying',false]);
 const reloaded={};updateWardenAppearance(f.e,reloaded,4,200);assert.deepEqual(f.props.slice(-2),[['hakkai:form',4],['hakkai:flying',false]]);
}
{
 const f=fixture();updateWardenAppearance(f.e,f.s,1,0);updateWardenAppearance(f.e,f.s,1,100,{idle:true});cancelWardenFlight(f.e,f.s,102);cancelWardenFlight(f.e,f.s,103);assert.equal(f.removes.length,1);
}
{
 const f=fixture();f.e.addEffect=()=>{throw Error('unsupported')};updateWardenAppearance(f.e,f.s,1,0);assert.equal(updateWardenAppearance(f.e,f.s,1,100,{idle:true}),false);assert.equal(f.s.takeoffAt,undefined);
}
// Real boss integration: no new warning is created while the boss is in the
// trial flight; after landing the next ordinary warning can proceed normally.
{
 const f=fixture(),messages=[],hp={currentValue:3990,effectiveMax:5000,setCurrentValue(v){this.currentValue=v;}};
 const p={id:'p',isValid:true,typeId:'minecraft:player',location:{x:0,y:80,z:6},dimension:f.dim,getGameMode:()=>GameMode.Survival,sendMessage:m=>messages.push([sys.currentTick,m]),applyDamage:()=>{},addEffect:()=>{}};
 Object.assign(f.e,{getComponent:()=>hp,getDynamicProperty:()=>undefined,setDynamicProperty:()=>{},playAnimation:()=>{}});
 f.dim.getPlayers=()=>[p];f.dim.getEntities=()=>[f.e];f.dim.spawnParticle=()=>{};
 const sys={currentTick:0},world={getAllPlayers:()=>[p],getDifficulty:()=>Difficulty.Normal},ctrl=setupWardenBoss({world,system:sys,property:()=>{},report:(_,e)=>{throw e;}});
 for(let t=0;t<=260;t++){
  sys.currentTick=t;if(t===122)f.e.isOnGround=false;if(t===181)f.e.isOnGround=true;ctrl.tick(p,t);
 }
 assert.ok(f.effects.some(x=>x[0]==='levitation'));assert.ok(f.props.some(([k,v])=>k==='hakkai:form'&&v===1));
 assert.ok(f.props.some(([k,v])=>k==='hakkai:flying'&&v===true));
 const warnings=messages.filter(([,m])=>m.includes('（約2秒）'));
 assert.ok(warnings.some(([t])=>t===80));assert.ok(!warnings.some(([t])=>t>121&&t<181));assert.ok(warnings.some(([t])=>t>=181));
}
// Real controller propagates every monotonic HP phase to the client property,
// even when a saved phase is loaded and health has regenerated.
{
 const f=fixture(),h={currentValue:5000,effectiveMax:5000,setCurrentValue(v){this.currentValue=v;}},saved=new Map();
 Object.assign(f.e,{getComponent:()=>h,getDynamicProperty:k=>saved.get(k),setDynamicProperty:(k,v)=>saved.set(k,v),playAnimation:()=>{}});
 const p={id:'p',isValid:true,typeId:'minecraft:player',location:{x:0,y:80,z:6},dimension:f.dim,getGameMode:()=>GameMode.Survival,sendMessage:()=>{}};
 f.dim.getPlayers=()=>[p];f.dim.getEntities=()=>[f.e];f.dim.spawnParticle=()=>{};
 const sys={currentTick:0},world={getAllPlayers:()=>[p],getDifficulty:()=>Difficulty.Normal},ctrl=setupWardenBoss({world,system:sys,property:()=>{},report:(_,e)=>{throw e;}});
 for(const [t,hp] of [[0,5000],[1,4000],[2,3000],[3,2000],[4,1000]]){sys.currentTick=t;h.currentValue=hp;ctrl.tick(p,t);}
 assert.deepEqual(f.props.filter(([k])=>k==='hakkai:form').map(([,v])=>v),[0,1,2,3,4]);
 h.currentValue=5000;const ctrl2=setupWardenBoss({world,system:sys,property:()=>{},report:(_,e)=>{throw e;}});sys.currentTick=10;ctrl2.tick(p,10);
 assert.deepEqual(f.props.filter(([k])=>k==='hakkai:form').at(-1),['hakkai:form',4]);
}
console.log('Warden appearance: form sync, real-ground wing state, safe takeoff, cancellation and combat scheduling (mocked)');
