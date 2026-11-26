// Sphere selection, notices and contact particles simulated, not Bedrock physics.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {Difficulty,GameMode} from '@minecraft/server';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
const bursts=mobContentList.filter(p=>p.temper==='hostile'&&p.talent==='burst');assert.equal(bursts.length,7);
const palette=['wind','spore','sand','frost','spark','shadow','wind','time'];
function fixture(profile,{reject=new Set(),parry=new Set(),evade=new Set(),failContact=false,relocate=false}={}){
 let time=0,players=[];const hits=[],notices=[],particles=[];
 const d={id:'r',getEntities:()=>[mob],getPlayers:({location,maxDistance})=>players.filter(p=>Math.hypot(p.location.x-location.x,p.location.y-location.y,p.location.z-location.z)<=maxDistance),
  spawnParticle:(id,at)=>{if(failContact&&id.startsWith('hakkai:mob_')&&at.y===80.8)throw Error('missing visual');particles.push([time,id,{...at}]);}};
 const make=(id,x)=>({id,typeId:'minecraft:player',isValid:true,dimension:d,location:{x,y:80,z:0},getGameMode:()=>GameMode.Survival,
  sendMessage:m=>notices.push([id,m]),applyDamage:n=>{hits.push([id,n]);if(relocate&&id==='q')q.location.x=100;return !reject.has(id)},addEffect:()=>{},applyImpulse:()=>{}});
 const p=make('p',2),q=make('q',3);players=[p,q];
 const mob={id:'mob',typeId:`hakkai:${profile.id}`,isValid:true,dimension:d,location:{x:0,y:80,z:0},playAnimation:()=>{},applyImpulse:()=>{},addEffect:()=>{},getComponent:()=>({currentValue:10,effectiveMax:20,setCurrentValue:()=>{}})};
 const system={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>players};
 const ctrl=setupMobSystem({ns:'hakkai:',world,system,num:()=>0,property:()=>{},report:()=>{},tryParry:p=>parry.has(p.id),isEvading:p=>evade.has(p.id)});
 const tick=(t,viewer=p)=>{time=system.currentTick=t;ctrl.tick(viewer,t)};
 return {p,q,make,tick,ctrl,hits,notices,particles,add:other=>players.push(other)};
}
for(const profile of bursts){
 const effect=`hakkai:mob_${palette[profile.realm]}`;
 test(`${profile.id}: each notified accepted victim gets one actual-location spark`,()=>{
  const f=fixture(profile,{relocate:true});f.tick(0);f.tick(120);assert.equal(f.notices.length,2);assert.ok(f.notices.every(([,msg])=>msg.includes('輪内に即時発生・壁を貫通')));
  const late=f.make('late',2.5);f.add(late);f.tick(160);assert.deepEqual(f.hits.map(x=>x[0]),['p','q']);
  const impacts=f.particles.filter(([t,id,at])=>t===160&&id===effect&&at.y===80.8);
  assert.deepEqual(impacts.map(([,id,at])=>at.x),[2,3],profile.id+' saves position before damage');
  const guide=f.ctrl.fieldGuide(f.p,mobContentList.indexOf(profile));assert.match(guide,/予告円内に即時発生し、壁を貫通/);
 });
 test(`${profile.id}: no contact for rejected, parried or evading victim`,()=>{
  for(const opt of [{reject:new Set(['q'])},{parry:new Set(['q'])},{evade:new Set(['q'])}]){
   const f=fixture(profile,opt);f.tick(0);f.tick(120);f.tick(160);
   const impacts=f.particles.filter(([t,id,at])=>t===160&&id===effect&&at.y===80.8);
   assert.deepEqual(impacts.map(([,id,at])=>at.x),[2]);
  }
  const ok=fixture(profile),broken=fixture(profile,{failContact:true});for(const n of [0,120,160]){ok.tick(n);broken.tick(n)}
  assert.deepEqual(broken.hits,ok.hits);assert.equal(broken.particles.filter(([t,id,at])=>id===effect&&at.y===80.8).length,0);
 });
}
