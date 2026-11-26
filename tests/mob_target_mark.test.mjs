import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Difficulty,GameMode} from '@minecraft/server';
import {createMobTargetMarks} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_target_mark.js';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
function context(){
 const particles=[],d={id:'realm',spawnParticle:(id,pos)=>particles.push([id,{...pos}])};
 const p={id:'p',isValid:true,typeId:'minecraft:player',dimension:d,location:{x:1,y:80,z:2}};
 return {p,d,particles,mob:{id:'m',isValid:true,dimension:d}};
}
test('marks follow only their player, pulse at most twice per 10 ticks, expire and clear across dimension changes',()=>{
 const f=context(),mark=createMobTargetMarks();assert.equal(mark.mark(f.mob,f.p,10,25,4),true);
 mark.tick(f.p,10);assert.equal(f.particles.length,2);assert.deepEqual(f.particles.map(x=>x[0]),['hakkai:mob_time','hakkai:climate_4']);
 f.p.location.x=10;mark.tick(f.p,10);mark.tick(f.p,19);assert.equal(f.particles.length,2);
 mark.tick(f.p,20);assert.equal(f.particles.length,4);assert.ok(f.particles[2][1].x>9);
 // Repeated hits extend, never shorten, and don't double-pulse.
 assert.ok(mark.mark(f.mob,f.p,21,30,2));assert.ok(mark.mark(f.mob,f.p,22,3,0));mark.tick(f.p,30);mark.tick(f.p,50);assert.equal(f.particles.length,8);
 mark.tick(f.p,51);mark.tick(f.p,60);assert.equal(f.particles.length,8);
 mark.mark(f.mob,f.p,100,50,1);f.p.dimension={id:'elsewhere',spawnParticle:()=>assert.fail('no cross-dimension mark')};mark.tick(f.p,110);
 f.p.dimension=f.d;mark.tick(f.p,120);assert.equal(f.particles.length,8);
 mark.mark(f.mob,f.p,130,30,1);mark.clear(f.p.id);mark.tick(f.p,140);assert.equal(f.particles.length,8);
});

test('invalid source, recipient, input and particle failures are isolated',()=>{
 const f=context(),marks=createMobTargetMarks();
 for(const [src,target,t,duration] of [[f.mob,f.p,NaN,10],[f.mob,f.p,1,0],[{...f.mob,isValid:false},f.p,1,10],[f.mob,{...f.p,dimension:{id:'other'}},1,10],[f.mob,{...f.p,typeId:'minecraft:pig'},1,10]])
  assert.equal(marks.mark(src,target,t,duration,0),false);
 marks.tick(f.p,10);assert.equal(f.particles.length,0);
 assert.equal(marks.mark(f.mob,f.p,10,50,2),true);f.d.spawnParticle=()=>{throw Error('missing particle')};assert.doesNotThrow(()=>marks.tick(f.p,11));
});

test('actual mob talents mark only accepted hits, never rejected/parried or unnotified players',()=>{
 const profiles=mobContentList.filter(p=>p.temper==='hostile'&&(p.talent==='mark'||[0,13].includes(p.signatureId%15)));
 assert.equal(mobContentList.filter(p=>p.talent==='mark').length,7);assert.ok(profiles.length>15);
 for(const profile of profiles)for(const mode of ['hit','reject','parry','unwarned']){
  const {p,d,mob,particles}=context();p.location={x:2,y:80,z:0};p.getGameMode=()=>GameMode.Survival;p.sendMessage=()=>{if(mode==='unwarned')throw Error('offline')};let hits=0;p.applyDamage=()=>{hits++;return mode!=='reject'};p.addEffect=()=>{};p.applyImpulse=()=>{};
  mob.typeId='hakkai:'+profile.id;mob.location={x:0,y:80,z:0};mob.playAnimation=()=>{};mob.addEffect=()=>{};mob.applyImpulse=()=>{};mob.getComponent=()=>({currentValue:10,effectiveMax:20,setCurrentValue:()=>{}});
  d.getEntities=()=>[mob];d.getPlayers=()=>[p];d.isChunkLoaded=()=>true;d.getBlock=()=>({isAir:true,isLiquid:false});d.getBlockFromRay=()=>undefined;
  const world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[p]},system={currentTick:0};
  const ctl=setupMobSystem({world,system,ns:'hakkai:',num:()=>0,property:()=>{},report:()=>{},tryParry:()=>mode==='parry'});
  for(const t of [0,120,160]){system.currentTick=t;ctl.tick(p,t)}
  const before=particles.length;ctl.tickMarks(p,161);
  if(mode==='hit'){assert.equal(hits,1,profile.id);assert.equal(particles.length,before+2,profile.id);}
  else assert.equal(particles.length,before,`${profile.id} ${mode}`);
  const guide=ctl.fieldGuide(p,mobContentList.indexOf(profile));assert.match(guide,/壁越しの輪郭表示/);
 }
});

test('main lifecycle hooks and runtime no longer request nonexistent glowing',()=>{
 const main=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 const mob=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js','utf8');
 assert.ok(main.includes('mobSystem?.tickMarks(p,t)'));assert.ok(main.includes('mobSystem?.clearMarks(playerId)'));assert.ok(!mob.includes("'glowing'"));
});

test('independent players and hard cap cannot create unbounded or cross-player mark state',()=>{
 const f=context(),marks=createMobTargetMarks();const players=[];
 for(let i=0;i<129;i++){
  const p={...f.p,id:'p'+i,location:{x:i,y:80,z:2}};players.push(p);
  assert.equal(marks.mark(f.mob,p,10,20,i%8),i<128);
 }
 marks.tick(players[0],10);assert.equal(f.particles.length,2);assert.ok(f.particles[0][1].x<1);
 marks.tick(players[1],10);assert.equal(f.particles.length,4);assert.equal(f.particles[3][0],'hakkai:climate_1');
 marks.tick(players[128],10);assert.equal(f.particles.length,4);
 marks.clear(players[0].id);assert.equal(marks.mark(f.mob,players[128],11,20,7),true);
 marks.tick(players[0],11);assert.equal(f.particles.length,4);marks.tick(players[128],11);assert.equal(f.particles.length,6);
 marks.tick(players[0],200);assert.equal(marks.mark(f.mob,players[0],200,10,0),true,'expiry releases capacity');
});
