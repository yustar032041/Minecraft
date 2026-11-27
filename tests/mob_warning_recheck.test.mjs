// Mock-only interruption/revalidation tests; not Bedrock event scheduling,
// rendering, physics or actual multiplayer validation.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {Difficulty,GameMode} from '@minecraft/server';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
const profiles=mobContentList.filter(p=>p.temper==='hostile'&&['leap','charge','armor','ward','burst'].includes(p.talent));assert.equal(profiles.length,39);
function fixture(profile,{onParry=()=>{},onParticle=()=>{},onRay=()=>{}}={}){
 const hits=[],notices=[],mobMoves=[],playerPush=[],selfEffects=[],particles=[];let time=0,rayCount=0,all=[];
 const d={id:'realm',isChunkLoaded:()=>true,getBlock:()=>({isAir:true,isLiquid:false}),getBlockFromRay:()=>{onRay({mob,p,q,count:++rayCount,time});return undefined;},
  // Deliberately return a stale query snapshot to test rechecks.
  getEntities:()=>[mob],getPlayers:()=>all,spawnParticle:(id,at)=>{particles.push([time,id]);onParticle({id,at,mob,p,q,time});}};
 const make=(id,x)=>({id,typeId:'minecraft:player',isValid:true,dimension:d,location:{x,y:80,z:0},getGameMode:()=>GameMode.Survival,
  sendMessage:()=>notices.push(id),applyDamage:n=>{hits.push([id,n]);return true;},applyImpulse:()=>playerPush.push(id),addEffect:()=>{}});
 const p=make('primary',['leap','charge','armor','ward'].includes(profile.talent)?.7:2),q=make('second',2.5);all=[p];
 const mob={id:'mob',typeId:`hakkai:${profile.id}`,isValid:true,dimension:d,location:{x:0,y:80,z:0},playAnimation:()=>{},applyImpulse:v=>mobMoves.push(v),addEffect:x=>selfEffects.push(x),getComponent:()=>({currentValue:10,effectiveMax:20,setCurrentValue:()=>{}})};
 const queue=[],system={currentTick:0,runTimeout:(fn,delay)=>queue.push({at:system.currentTick+delay,fn})},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>all};
 const ctrl=setupMobSystem({ns:'hakkai:',world,system,num:()=>0,property:()=>{},report:()=>{},isEvading:()=>false,tryParry:player=>{onParry({player,mob,p,q,time});return false;}});
 const tick=t=>{
  time=system.currentTick=t;
  if(t===160&&profile.talent==='burst'){p.location.x=q.location.x=0;p.location.z=q.location.z=0;}
  ctrl.tick(p,t);
  if(t===160&&profile.talent==='burst')while(time<172){time=++system.currentTick;while(queue.some(x=>x.at===time)){const i=queue.findIndex(x=>x.at===time);queue.splice(i,1)[0].fn();}}
 };
 return {p,q,mob,d,tick,hits,notices,mobMoves,playerPush,selfEffects,particles,players:next=>all=next};
}
for(const profile of profiles){
 test(`${profile.id}: movement or invalidation during parry cannot hit the old warning`,()=>{
  for(const change of ['outside','vertical','dimension','invalid','caster_dimension','caster_invalid',...(profile.talent==='burst'?[]:['caster_far'])]){
   const f=fixture(profile,{onParry:({p,mob})=>{
    if(change==='outside')p.location.x=30;
    if(change==='vertical')p.location.y=83.1;
    if(change==='dimension')p.dimension={id:'other'};
    if(change==='invalid')p.isValid=false;
    if(change==='caster_dimension')mob.dimension={id:'other'};
    if(change==='caster_invalid')mob.isValid=false;
    if(change==='caster_far')mob.location.x=-30;
   }});
   for(const t of [0,120,160])f.tick(t);
   assert.deepEqual(f.hits,[],`${profile.id}/${change}`);assert.deepEqual(f.playerPush,[],`${profile.id}/${change}`);assert.deepEqual(f.mobMoves,[],`${profile.id}/${change}`);
  }
 });
 test(`${profile.id}: visual callback moving target outside warning prevents stale hit`,()=>{
  let changed=false;
  const f=fixture(profile,{onParticle:({id,p,time})=>{if((profile.talent==='burst'?time>160&&id.startsWith('hakkai:shot_'):time===160&&id.startsWith('hakkai:mob_'))&&!changed){changed=true;p.location.x=30;}}});
  for(const t of [0,120,160])f.tick(t);
  assert.ok(changed,profile.id);assert.deepEqual(f.hits,[],profile.id);assert.deepEqual(f.playerPush,[],profile.id);assert.deepEqual(f.mobMoves,[],profile.id);
 });
}
for(const profile of profiles.filter(p=>p.talent==='burst'))test(`${profile.id}: each warned burst victim is revalidated after parry`,()=>{
 for(const change of ['outside','dimension','invalid']){
  const f=fixture(profile,{onParry:({player,q})=>{if(player.id==='second'){
   if(change==='outside')q.location.x=30;if(change==='dimension')q.dimension={id:'other'};if(change==='invalid')q.isValid=false;
  }}});
  f.players([f.p,f.q]);for(const t of [0,120,160])f.tick(t);
  assert.deepEqual(f.notices,[]);assert.deepEqual(f.hits.map(x=>x[0]),['primary'],change);
 }
});
for(const profile of profiles.filter(p=>['leap','charge'].includes(p.talent)))test(`${profile.id}: ray callback relocation cannot strike or apply a chase impulse`,()=>{
 let changed=false;
 const f=fixture(profile,{onRay:({p,count,time})=>{if(time===160&&count===2){changed=true;p.location.x=7;}}});
 for(const t of [0,120,160])f.tick(t);assert.ok(changed);assert.deepEqual(f.hits,[]);assert.deepEqual(f.mobMoves,[]);
 if(profile.talent==='leech')assert.ok(!f.particles.some(([t,id])=>t===160&&(id==='hakkai:mob_shadow'||id==='hakkai:mob_time')));
});

for(const profile of profiles.filter(p=>p.talent==='burst'))test(`${profile.id}: one victim leaving on parry does not block another notified player`,()=>{
 const f=fixture(profile,{onParry:({player})=>{if(player.id==='primary')player.location.x=30;}});
 f.players([f.p,f.q]);for(const t of [0,120,160])f.tick(t);
 assert.deepEqual(f.hits.map(x=>x[0]),['second']);
});
