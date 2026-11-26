// Real controller with simulated player/dimension API; not Bedrock multiplayer.
import assert from 'node:assert/strict';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {Difficulty,GameMode} from '@minecraft/server';
const bursts=mobContentList.filter(p=>p.temper==='hostile'&&p.talent==='burst');assert.equal(bursts.length,7);
function fixture(profile,{evade=new Set(),parry=new Set(),failWarning=false}={}){
 let time=0,all=[];const hits=[],notices=[],warningText=[],impulses=[],effects=[],particles=[];
 const d={id:'realm',getEntities:()=>[mob],getPlayers:({location,maxDistance})=>all.filter(p=>p.dimension.id==='realm'&&Math.hypot(p.location.x-location.x,p.location.y-location.y,p.location.z-location.z)<=maxDistance),spawnParticle:(id,pos)=>{if(failWarning&&id==='hakkai:warning_marker')throw Error('marker');particles.push([id,pos]);}};
 const player=(id,x=2)=>({id,typeId:'minecraft:player',isValid:true,dimension:d,location:{x,y:80,z:0},getGameMode:()=>GameMode.Survival,sendMessage:message=>{notices.push(id);warningText.push([id,message]);},applyDamage:n=>{hits.push([id,n]);return true},applyImpulse:()=>impulses.push(id),addEffect:id=>effects.push(id)});
 const p=player('primary'),q=player('second',3);all=[p,q];
 const mob={id:'m',isValid:true,typeId:'hakkai:'+profile.id,dimension:d,location:{x:0,y:80,z:0},playAnimation:()=>{},addEffect:()=>{},applyImpulse:()=>{},getComponent:()=>({currentValue:10,effectiveMax:20,setCurrentValue:()=>{}})};
 const system={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>all};
 const ctrl=setupMobSystem({ns:'hakkai:',world,system,num:()=>0,property:()=>{},report:(_,e)=>{throw e},isEvading:p=>evade.has(p.id),tryParry:p=>parry.has(p.id)});
 const tick=(t,viewer=p)=>{system.currentTick=time=t;ctrl.tick(viewer,t);};
 return {p,q,mob,player,tick,hits,notices,warningText,impulses,effects,particles,setPlayers:ps=>all=ps};
}
for(const profile of bursts){
 for(const y of [77,83])for(const moveDuringWindup of [false,true]){
  // At the horizontal edge and ±3 high, this player was formerly excluded
  // by the spherical API query even though insideWarning accepts the point.
  const f=fixture(profile),edge=2+4+profile.variant-.01;
  if(!moveDuringWindup)f.q.location={x:edge,y,z:0};
  f.tick(0);f.tick(120);
  assert.ok(f.notices.includes('second'),`${profile.id}/${y}: eligible height gets warning`);
  assert.ok(f.warningText.every(([,text])=>text.includes('上下3ブロック')&&text.includes('通知を受けた人が対象')));
  if(moveDuringWindup)f.q.location={x:edge,y,z:0};
  f.p.location.x=20;f.tick(160,f.q);
  assert.deepEqual(f.hits.map(x=>x[0]),['second'],`${profile.id}/${y}: warned fallback in full cylinder`);
 }
 for(const y of [76.99,83.01]){
  const f=fixture(profile);f.tick(0);f.tick(120);f.q.location.y=y;f.p.location.x=20;f.tick(160,f.q);
  assert.deepEqual(f.hits,[],`${profile.id}/${y}: outside height cannot hit`);
 }
 for(const action of ['left','disconnected','evaded','other-dimension','above']){
  const evade=new Set(),f=fixture(profile,{evade});f.tick(0);f.tick(120);
  assert.ok(f.notices.includes('primary')&&f.notices.includes('second'));
  if(action==='left')f.p.location.x=20;
  if(action==='disconnected')f.setPlayers([f.q]);
  if(action==='evaded')evade.add('primary');
  if(action==='other-dimension')f.p.dimension={id:'other'};
  if(action==='above')f.p.location.y=84;
  f.tick(160,f.q);assert.deepEqual(f.hits.map(x=>x[0]),['second'],`${profile.id}/${action}`);
 }
 {
  // Leaving the warning and a late arrival cannot gain notice retroactively.
  const f=fixture(profile);f.tick(0);f.tick(120);const late=f.player('late',3);f.p.location.x=20;f.setPlayers([f.p,late]);f.tick(160,late);assert.equal(f.hits.length,0,profile.id);
 }
 {
  const f=fixture(profile);f.q.sendMessage=()=>{throw Error('notice unavailable')};f.tick(0);f.tick(120);f.p.location.x=20;f.tick(160,f.q);
  assert.deepEqual(f.hits,[],'an unnotified bystander cannot become the fallback anchor');
 }
 {
  const parry=new Set(['second']),f=fixture(profile,{parry});f.tick(0);f.tick(120);f.p.location.x=20;f.tick(160,f.q);assert.equal(f.hits.length,0,profile.id);
 }
 {
  const f=fixture(profile);f.q.applyDamage=n=>{f.hits.push(['second',n]);return false};f.tick(0);f.tick(120);f.p.location.x=20;f.tick(160,f.q);assert.deepEqual(f.impulses,[],profile.id);
 }
 {
  const f=fixture(profile);f.tick(0);f.tick(120);f.p.location.x=20;f.tick(170,f.q);assert.equal(f.hits.length,0,'late warning expires');
 }
 {
  const f=fixture(profile,{failWarning:true});f.tick(0);f.tick(120);f.p.location.x=20;f.tick(160,f.q);assert.equal(f.hits.length,0,'failed ring cancels');
 }
}
// Fallback must be within nine blocks of caster even when inside the circle.
{
 const f=fixture(bursts[0]);f.p.location.x=10;f.q.location.x=10.5;f.tick(0);f.tick(120);f.p.location.x=20;f.tick(160,f.q);assert.deepEqual(f.hits,[]);
}
console.log('7 burst talents: warned fallback, exits, evade, logout, height, parry, refused hits and failures (mocked)');
