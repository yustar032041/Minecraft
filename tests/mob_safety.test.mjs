// Simulation: these tests exercise the actual scripted combat controller, not
// Bedrock's rendering, networking, damage pipeline, or entity AI.
import assert from 'node:assert/strict';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {Difficulty,GameMode} from '@minecraft/server';
function fixture(type, options={}){
 const effects=[],pushes=[],hits=[],markers=[],messages=[];
 const d={id:'hakkai:realm_0',getEntities:()=>[mob],getPlayers:()=>[p],spawnParticle:(id,loc)=>{if(options.noParticle&&id==='hakkai:warning_marker')throw Error('unavailable');markers.push({id,loc});}};
 const p={id:'player',typeId:'minecraft:player',isValid:true,location:{x:2,y:80,z:0},dimension:d,getGameMode:()=>GameMode.Survival,
  sendMessage:m=>{if(options.noMessage)throw Error('offline');messages.push(m)},applyDamage:n=>{hits.push(n);if(options.throwDamage)throw Error('damage');return !options.refuseDamage},
  applyImpulse:v=>pushes.push(v),addEffect:(id)=>effects.push(id)};
 const mob={id:'mob',typeId:type,isValid:true,location:{x:0,y:80,z:0},dimension:d,applyImpulse:()=>{},addEffect:()=>{},getComponent:()=>({currentValue:5000,effectiveMax:5000,setCurrentValue:()=>{}})};
 const system={currentTick:0},world={difficulty:Difficulty.Normal,getDifficulty(){return this.difficulty},getAllPlayers:()=>[p]};
 const controller=setupMobSystem({ns:'hakkai:',world,system,num:()=>0,property:()=>{},report:()=>assert.fail('unexpected report'),...options.ctx});
 const tick=t=>{system.currentTick=t;controller.tick(p,t)};
 return {d,p,mob,system,world,controller,tick,effects,pushes,hits,markers,messages};
}
const hostile=mobContentList.filter(m=>m.temper==='hostile');
assert.equal(hostile.length,104);
for(const mob of hostile){
 const accepted=fixture('hakkai:'+mob.id);for(const t of [0,120,160])accepted.tick(t);assert.ok(accepted.hits.length,`${mob.id} lands its close-range attack`);
 const f=fixture('hakkai:'+mob.id,{refuseDamage:true});
 for(const t of [0,120,160])f.tick(t);
 assert.equal(f.markers.filter(x=>x.id==='hakkai:warning_marker').length,16,`${mob.id} gets visible warning`);
 assert.deepEqual(f.effects,[],`${mob.id}: rejected damage cannot add player effects`);
 assert.deepEqual(f.pushes,[],`${mob.id}: rejected damage cannot push player`);
}
const burst=hostile.find(m=>m.talent==='burst');
{
 const f=fixture('hakkai:'+burst.id),q={...f.p,id:'outside',location:{x:2+4+burst.variant+.5,y:80,z:0}};
 f.d.getPlayers=()=>[f.p,q];f.world.getAllPlayers=()=>[f.p,q];
 for(const t of [0,120,160])f.tick(t);
 assert.equal(f.hits.length,1,'burst is confined to the marked circle');
}
{
 const events=[],calls=[];
 const f=fixture('hakkai:'+burst.id,{ctx:{tryParry:p=>{calls.push(p.id);return p.id==='player';}}});
 const q={...f.p,id:'second',location:{x:3,y:80,z:0},applyDamage:()=>{events.push('hit second');return true},applyImpulse:()=>{},addEffect:()=>{}};
 f.d.getPlayers=()=>[f.p,q];f.world.getAllPlayers=()=>[f.p,q];
 for(const t of [0,120,160])f.tick(t);
 assert.deepEqual(calls,['player','second']);assert.deepEqual(events,['hit second']);assert.equal(f.hits.length,0,'one player parrying does not cancel another player');
}
for(const options of [{noParticle:true},{noMessage:true}]){
 const f=fixture('hakkai:wild_0_2',options);for(const t of [0,120,160])f.tick(t);assert.equal(f.hits.length,0,'no attack without warning');
}
{
 const f=fixture('hakkai:wild_0_2');for(const t of [0,120])f.tick(t);f.tick(200);assert.equal(f.hits.length,0,'late unloaded or delayed attack is canceled');
}
{
 const f=fixture('hakkai:wild_0_2');for(const t of [0,120])f.tick(t);f.world.difficulty=Difficulty.Peaceful;f.tick(160);
 assert.equal(f.hits.length,0,'peaceful cancels pending attack');f.world.difficulty=Difficulty.Normal;f.tick(200);assert.equal(f.hits.length,0,'old warning is not reused');
}
{
 const f=fixture('hakkai:wild_0_2');for(const t of [0,120])f.tick(t);f.p.location.x=8;f.tick(160);assert.equal(f.hits.length,0,'leaving the marked circle avoids hit');
}
for(const options of [{refuseDamage:true},{throwDamage:true},{noParticle:true}]){
 const f=fixture('hakkai:eclipse_colossus',options);for(const t of [0,120,160])f.tick(t);
 assert.deepEqual(f.effects,[],'boss cannot add effect when hit is refused');assert.deepEqual(f.pushes,[],'boss cannot push when hit is refused');
 if(options.noParticle)assert.equal(f.hits.length,0,'boss cannot strike without visible warning');
}
{
 // Exercise all eight final-phase patterns with canceled damage, including
 // the intentionally status-only outer areas of roar and rewind.
 const f=fixture('hakkai:eclipse_colossus',{refuseDamage:true});
 f.mob.getComponent=()=>({currentValue:1000,effectiveMax:5000,setCurrentValue:()=>{}});
 for(let t=0;t<=1800;t+=40)f.tick(t);
 for(const label of ['八界断ち','星骸落とし','時環封じ','蝕光爆ぜ','影兵招来','時空裂波','終焉咆哮','逆刻再編'])assert.ok(f.messages.some(m=>m.includes(label)),label);
 assert.deepEqual(f.effects,[]);assert.deepEqual(f.pushes,[]);
}
{
 const f=fixture('hakkai:eclipse_colossus');for(const t of [0,120,200])f.tick(t);assert.equal(f.hits.length,0,'delayed boss attack expires');
}
console.log(`Mob safety: ${hostile.length} hostile profiles, warning bounds, cancellation, peaceful and rejected damage OK (simulated)`);
