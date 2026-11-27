// Real king cycle with a mocked Script API, not Bedrock physics/network/timers.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Difficulty,GameMode} from '@minecraft/server';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {createGuardianMultiplayer} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_multiplayer.js';
function fixture(options={}){
 let now=0,brokenScan=false,blocked=false;const all=[],spawns=[],messages=[];
 const d={id:'realm',getPlayers:()=>[p],getEntities:q=>{
  if(q.families?.includes('hakkai_king_guardian')){
   if(brokenScan&&q.maxDistance===34)throw Error('scan unavailable');
   if(q.maxDistance===28)return [];return all.filter(e=>e.isValid);
  }
  if(q.families)return [];
  if(q.closest===1)return [];
  return [king];
 },isChunkLoaded:()=>true,getBlock:pos=>pos.y===79?{isAir:false,isLiquid:false,isWaterlogged:false,typeId:'minecraft:stone'}:{isAir:!blocked},
 getBlockFromRay:pos=>({face:'Up',block:{location:{y:79}},faceLocation:{y:1}}),spawnParticle:()=>{},
 spawnEntity:(id,pos)=>{
  if(!id.startsWith('hakkai:king_guardian_'))return undefined;
  const props={};const entity={id:'g'+all.length,typeId:id,isValid:true,dimension:d,location:{...pos},
   setDynamicProperty:(k,v)=>{if(options.failOwner)throw Error('property');props[k]=v},getDynamicProperty:k=>props[k],remove(){this.isValid=false}};
  all.push(entity);spawns.push([now,entity]);return entity;
 }};
 const p={id:'player',typeId:'minecraft:player',isValid:true,dimension:d,location:{x:2,y:80,z:0},getGameMode:()=>GameMode.Survival,
  sendMessage:m=>messages.push([now,m]),applyDamage:()=>true,addEffect:()=>{},applyImpulse:()=>{}};
 const king={id:'king',typeId:'hakkai:eclipse_colossus',isValid:true,dimension:d,location:{x:0,y:80,z:0},getComponent:()=>({currentValue:100,effectiveMax:100,setCurrentValue:()=>{}}),playAnimation:()=>{}};
 const system={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[p]};
 const ctrl=setupMobSystem({ns:'hakkai:',world,system,num:()=>0,property:()=>{},report:()=>{}});
 const go=t=>{now=system.currentTick=t;ctrl.tickBosses(p,t);ctrl.tickBosses(p,t);};
 return {go,all,spawns,messages,king,ctrl,d,setScan:v=>brokenScan=v,setBlocked:v=>blocked=v};
}
const run=(f,end)=>{for(let t=0;t<=end;t+=10)f.go(t)};
test('king invokes the distinct summon in the existing cycle without a floor warning',()=>{
 const f=fixture();run(f,680);
 assert.ok(!f.messages.some(([t,m])=>t===640&&m.includes('八界守護の影')));
 assert.deepEqual(f.spawns.map(([t,e])=>[t,e.typeId]),[[680,'hakkai:king_guardian_0'],[680,'hakkai:king_guardian_1']]);
 for(const [,e] of f.spawns){assert.equal(e.getDynamicProperty('hakkai:king_owner'),'king');assert.ok(Math.abs(Math.hypot(e.location.x,e.location.z)-5)<1e-8);}
 const tracking=createGuardianMultiplayer({spectator:GameMode.Spectator});
 for(const [,e] of f.spawns)assert.deepEqual(tracking.participants(e,{},680),[],'never a normal challenge reward');
});
test('summon follows king at release and is independent of marker or message failures',()=>{
 const f=fixture();run(f,630);
 f.d.spawnParticle=()=>{throw Error('no particles');};
 const player=f.d.getPlayers()[0];f.d.getPlayers=()=>[{...player,sendMessage:()=>{throw Error('no chat');}}];
 f.go(640);f.king.location.x=10;f.go(680);
 assert.equal(f.spawns.length,2);
 for(const [,e] of f.spawns)assert.ok(Math.abs(Math.hypot(e.location.x-10,e.location.z)-5)<1e-8);
});
test('cap, occupied/unknown ground, owner failure and late update refuse new summons',()=>{
 const full=fixture();full.all.push({isValid:true},{isValid:true});run(full,680);assert.equal(full.spawns.length,0);
 const scan=fixture();scan.setScan(true);run(scan,680);assert.equal(scan.spawns.length,0);
 const ground=fixture();ground.setBlocked(true);run(ground,680);assert.equal(ground.spawns.length,0);
 const owner=fixture({failOwner:true});run(owner,680);assert.equal(owner.spawns.length,1);assert.equal(owner.spawns[0][1].isValid,false);
 const late=fixture();run(late,640);late.go(690);assert.equal(late.spawns.length,0);
});
test('rotation reaches all eight and death removes only loaded owned summons',()=>{
 const f=fixture();let index=0;
 for(let t=0;t<=2700;t+=10){
  f.go(t);
  if(f.spawns.length>index){for(const [,e] of f.spawns.slice(index))e.isValid=false;index=f.spawns.length;}
 }
 assert.deepEqual(f.spawns.slice(0,8).map(([,e])=>e.typeId),Array.from({length:8},(_,i)=>`hakkai:king_guardian_${i}`));
 const own=f.spawns[0][1],other=f.spawns[1][1];own.isValid=true;other.isValid=true;other.setDynamicProperty('hakkai:king_owner','other-king');
 f.ctrl.onDeath({deadEntity:f.king});assert.equal(own.isValid,false);assert.equal(other.isValid,true);
});
