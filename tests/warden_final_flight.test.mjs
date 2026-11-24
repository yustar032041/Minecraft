import assert from 'node:assert/strict';
import {updateWardenAppearance} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_appearance.js';
import {setupWardenBoss} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_boss.js';
import {WARDEN_MOVING} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_moving_attacks.js';
import {GameMode,Difficulty} from '@minecraft/server';
function fixture(){
 const props=[],effects=[],removed=[],hits=[],messages=[],particles=[];const sys={currentTick:0};
 const d={id:'hakkai:warden_arena',isChunkLoaded:()=>true,getBlock:()=>({isAir:true}),getPlayers:()=>[p],getEntities:()=>[e],spawnParticle:(id,at)=>particles.push([sys.currentTick,id,at])};
 const p={id:'p',isValid:true,typeId:'minecraft:player',location:{x:0,y:80,z:3},dimension:d,isSneaking:true,getGameMode:()=>GameMode.Survival,sendMessage:m=>messages.push([sys.currentTick,m]),applyDamage:n=>hits.push([sys.currentTick,n]),addEffect:()=>{},playSound:()=>{}};
 const hp={currentValue:990,effectiveMax:5000,setCurrentValue(v){this.currentValue=v;}};
 const e={id:'e',isValid:true,typeId:'hakkai:time_warden',isOnGround:true,location:{x:0,y:80,z:0},dimension:d,getComponent:()=>hp,getDynamicProperty:()=>undefined,setDynamicProperty:()=>{},setProperty:(k,v)=>props.push([sys.currentTick,k,v]),addEffect:(...x)=>effects.push([sys.currentTick,...x]),removeEffect:x=>removed.push([sys.currentTick,x]),playAnimation:()=>{}};
 const world={getAllPlayers:()=>[p],getDifficulty:()=>Difficulty.Normal},ctrl=setupWardenBoss({world,system:sys,property:()=>{},spendParry:()=>true,report:(_,error)=>{throw error;}});
 const tick=t=>{sys.currentTick=t;ctrl.tick(p,t);};return {p,e,d,hp,sys,world,ctrl,tick,props,effects,removed,hits,messages,particles};
}
// Final form begins a genuine levitation effect and permits a warning during
// low flight, followed by the normal close-range parry while wings are visible.
{
 const f=fixture();for(let t=0;t<=141;t++){
  if(t===122){f.e.isOnGround=false;f.e.location.y=80.6;}f.tick(t);
 }
 assert.ok(f.effects.some(([t,id,duration])=>t===121&&id==='levitation'&&duration===28));
 assert.ok(f.props.some(([t,k,v])=>t===122&&k==='hakkai:flying'&&v===true));
 assert.ok(f.messages.some(([t,m])=>t===141&&m.includes('空の弾幕')),'warning starts while visibly flying');
 assert.ok(f.particles.some(([t,id])=>t>121&&id==='hakkai:warden_moon'),'flight has a bounded cosmetic aura');
 f.sys.currentTick=173;assert.equal(f.ctrl.onMeleeParry({damagingEntity:f.p,hitEntity:f.e}),true);
 assert.ok(f.removed.some(([t,id])=>t===173&&id==='levitation'));
 f.hits.length=0;for(let t=174;t<=181;t++)f.tick(t);assert.deepEqual(f.hits,[],'airborne warning cancelled by parry');
 f.e.isOnGround=true;f.e.location.y=80;f.tick(182);assert.deepEqual(f.props.at(-1).slice(1),['hakkai:flying',false]);
}
// If unpredictable physics carries the boss too high, cancel a warning that
// started in flight rather than hit while the close counter is unreachable.
{
 const f=fixture();for(let t=0;t<=141;t++){if(t===122){f.e.isOnGround=false;f.e.location.y=80.6;}f.tick(t);}
 f.hits.length=0;f.e.location.y=82.3;f.tick(142);
 assert.ok(!f.removed.some(([t,id])=>t===142&&id==='levitation'),'flight continues at moderate height');
 for(let t=143;t<=210;t++)f.tick(t);assert.deepEqual(f.hits,[]);
 assert.equal(f.messages.filter(([t,m])=>t>142&&m.includes('（約2秒）')).length,0,'no more attacks until safe landing');
 f.e.isOnGround=true;f.e.location.y=80;f.tick(211);for(let t=212;t<=250;t++)f.tick(t);
 assert.ok(f.messages.some(([t,m])=>t>=211&&m.includes('（約2秒）')),'ground attacks resume after landing and cooldown');
}
// Even if the engine reports grounded on a raised obstruction, an attack
// launched below must be cancelled on the first too-high tick.
{
 const f=fixture();for(let t=0;t<=141;t++){if(t===122){f.e.isOnGround=false;f.e.location.y=80.6;}f.tick(t);}
 f.hits.length=0;f.e.location.y=82.3;f.e.isOnGround=true;f.tick(142);
 for(let t=143;t<=181;t++)f.tick(t);assert.deepEqual(f.hits,[]);
}
// Unsafe landing timeouts cannot silently resume attacks while still aloft.
{
 const f=fixture(),s={};updateWardenAppearance(f.e,s,4,0);assert.equal(updateWardenAppearance(f.e,s,4,100,{idle:true}),true);
 f.e.isOnGround=false;f.e.location.y=83;assert.equal(updateWardenAppearance(f.e,s,4,101,{idle:true}),true);
 assert.equal(updateWardenAppearance(f.e,s,4,280,{idle:true}),true);assert.equal(updateWardenAppearance(f.e,s,4,281,{idle:true}),true);
 f.e.isOnGround=true;f.e.location.y=80;assert.equal(updateWardenAppearance(f.e,s,4,282,{idle:true}),false);
}
// Fifth-form takeoff has the same environmental and peaceful safety checks.
for(const reason of ['blocked','unloaded','player','peaceful']){
 const f=fixture(),s={};updateWardenAppearance(f.e,s,4,0);
 if(reason==='blocked')f.d.getBlock=()=>({isAir:false});if(reason==='unloaded')f.d.isChunkLoaded=()=>false;
 if(reason==='player')f.d.getPlayers=()=>[{isValid:true,location:{x:0,y:84,z:0}}];
 assert.equal(updateWardenAppearance(f.e,s,4,100,{idle:true,peaceful:reason==='peaceful'}),false);assert.equal(f.effects.length,0,reason);
}
// Unsupported client-sync properties prevent invisible-winged takeoff.
{
 const f=fixture(),s={};f.e.setProperty=()=>{throw Error('no entity properties');};
 updateWardenAppearance(f.e,s,4,0);assert.equal(updateWardenAppearance(f.e,s,4,100,{idle:true}),false);assert.equal(f.effects.length,0);
}
// If synchronizing the wings fails during flight, don't begin aerial attacks.
{
 const f=fixture(),s={};updateWardenAppearance(f.e,s,4,0);updateWardenAppearance(f.e,s,4,100,{idle:true});f.e.isOnGround=false;f.e.location.y=80.6;
 f.e.setProperty=(k,v)=>{if(k==='hakkai:flying'&&v===true)throw Error('sync failed');};
 assert.equal(updateWardenAppearance(f.e,s,4,101),true);assert.equal(updateWardenAppearance(f.e,s,4,112),true);
 f.e.setProperty=()=>{};assert.equal(updateWardenAppearance(f.e,s,4,121),false,'attack allowed after the wing sync can be retried');
}
// The same over-height safety rule also cancels an already moving attack,
// rather than leaving damaging particles running after flight interruption.
{
 const f=fixture();f.d.getBlockFromRay=()=>undefined;let lift=-1,warning=-1;
 for(let t=0;t<16000;t++){
  if(lift>=0&&t>lift&&t<lift+95){f.e.isOnGround=false;f.e.location.y=80.6;}
  else if(lift>=0&&t>=lift+95){f.e.isOnGround=true;f.e.location.y=80;}
  f.tick(t);
  if(f.effects.some(([at,id])=>at===t&&id==='levitation'))lift=t;
  if(!f.e.isOnGround&&f.messages.some(([at,msg])=>at===t&&WARDEN_MOVING[4].some(a=>msg.includes(`§c${a.attack}：`)))){warning=t;break;}
 }
 assert.ok(warning>=0,'a moving pattern is scheduled in the fifth-form flight');
 for(let t=warning+1;t<=warning+41;t++)f.tick(t);
 assert.ok(f.particles.some(([t,id])=>t===warning+41&&id.startsWith('hakkai:warden_front_')),'the moving front has started');
 f.hits.length=0;f.e.location.y=82.3;f.tick(warning+42);
 for(let t=warning+43;t<=warning+56;t++)f.tick(t);
 assert.equal(f.particles.filter(([t,id])=>t>=warning+42&&id.startsWith('hakkai:warden_front_')).length,0);assert.deepEqual(f.hits,[]);
}
console.log('Final warden: safe fifth-form takeoff, wings, in-flight warning/parry, altitude cancellation and landing (mocked)');
