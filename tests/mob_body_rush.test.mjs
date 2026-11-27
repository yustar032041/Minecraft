// Mocked body position, callbacks and physics. Not proof of Bedrock AI/physics.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {Difficulty,GameMode} from '@minecraft/server';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {BODY_RUSH} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_body_rush.js';
import {scaledMobDamage} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_balance.js';
const profiles=mobContentList.filter(p=>p.temper==='hostile'&&['charge','leap'].includes(p.talent));
assert.equal(profiles.length,14);assert.deepEqual(Object.keys(BODY_RUSH).sort(),profiles.map(p=>p.id).sort());
function fixture(profile,{parry=()=>false,reject=false}={}){
 let wall=false,loaded=true;const queue=[],hits=[],moves=[],pushes=[],particles=[];
 const system={currentTick:0,runTimeout:(fn,delay)=>queue.push({at:system.currentTick+delay,fn})};
 const d={id:'r',isChunkLoaded:()=>loaded,getBlock:()=>({isAir:true}),getBlockFromRay:()=>wall?{block:{}}:undefined,getEntities:()=>[mob],getPlayers:()=>[p],spawnParticle:(id,at)=>particles.push([system.currentTick,id,{...at}])};
 const p={id:'p',typeId:'minecraft:player',isValid:true,dimension:d,location:{x:4.5,y:80,z:0},getGameMode:()=>GameMode.Survival,applyDamage:n=>{hits.push(n);return !reject},addEffect:()=>{},applyImpulse:v=>pushes.push(v)};
 const mob={id:'m',typeId:'hakkai:'+profile.id,isValid:true,dimension:d,location:{x:0,y:80,z:0},playAnimation:()=>{},addEffect:()=>{},applyImpulse:v=>moves.push(v),getComponent:()=>({currentValue:10,effectiveMax:20,setCurrentValue:()=>{}})};
 const world={difficulty:Difficulty.Normal,getDifficulty(){return this.difficulty;},getAllPlayers:()=>[p]};
 const ctrl=setupMobSystem({ns:'hakkai:',world,system,report:()=>{},num:()=>0,property:()=>{},tryParry:parry});
 for(const t of [0,120,160]){system.currentTick=t;ctrl.tick(p,t);}
 function tick(t,x){system.currentTick=t;if(x!==undefined)mob.location.x=x;while(queue.some(q=>q.at===t)){const i=queue.findIndex(q=>q.at===t);queue.splice(i,1)[0].fn();}}
 return {p,mob,d,system,world,ctrl,queue,tick,hits,moves,pushes,particles,wall:v=>wall=v,loaded:v=>loaded=v};
}
for(const profile of profiles){
 test(`${profile.id}: distinctive impulse and real close-body contact only`,()=>{
  const f=fixture(profile),spec=BODY_RUSH[profile.id];assert.equal(f.moves.length,1);assert.deepEqual(f.moves[0],{x:spec.speed,y:spec.lift,z:0});assert.deepEqual(f.hits,[]);
  f.tick(161,1);f.tick(162,2);f.tick(163,3);assert.deepEqual(f.hits,[]);f.tick(164,3.8);
  assert.equal(f.hits.length,1);assert.equal(f.hits[0],scaledMobDamage((profile.talent==='leap'?5:6)+2*profile.variant,profile.realm));
  f.tick(165,4);assert.equal(f.hits.length,1);assert.ok(f.particles.some(([t,id])=>t===164&&id==='hakkai:mob_impact'));
 });
 test(`${profile.id}: dodge, terrain, rejected damage and interruptions`,()=>{
  for(const mode of ['wall','unloaded','dodge','parry','reject','stagger','late','peaceful','teleport']){
   const f=fixture(profile,{parry:()=>mode==='parry',reject:mode==='reject'});
   if(mode==='wall')f.wall(true);if(mode==='unloaded')f.loaded(false);if(mode==='dodge')f.p.location.z=4;
   if(mode==='stagger')f.ctrl.stagger(f.mob,160);if(mode==='peaceful')f.world.difficulty=Difficulty.Peaceful;
   if(mode==='late'){const task=f.queue.shift();f.system.currentTick=165;task.fn();}
   if(mode==='teleport')f.tick(161,3.8);else{f.tick(161,1);f.tick(162,2);f.tick(163,3);f.tick(164,3.8);}
   assert.equal(f.hits.length,mode==='reject'?1:0,`${profile.id}/${mode}`);
   assert.equal(f.pushes.length,0,`${profile.id}/${mode}`);
  }
 });
}
test('parry callback moving either combatant cannot produce stale body contact',()=>{
 for(const change of [(p)=>p.location.z=5,(_,m)=>m.location.z=5]){
  const f=fixture(profiles[0],{parry:(p,m)=>{change(p,m);return false;}});
  f.tick(161,1);f.tick(162,2);f.tick(163,3);f.tick(164,3.8);assert.deepEqual(f.hits,[]);
 }
});
