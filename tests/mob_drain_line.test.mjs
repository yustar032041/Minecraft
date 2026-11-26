// Mock-only geometry and ordering. This is an instant visual line, not a
// Bedrock projectile, swept shape, multiplayer or rendering verification.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Difficulty,GameMode} from '@minecraft/server';
import {setupMobSystem,DRAIN_RANGE,DRAIN_HEIGHT} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {drainLink} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_talent_effects.js';
const drains=mobContentList.filter(p=>p.temper==='hostile'&&p.talent==='leech');assert.equal(drains.length,8);
function fixture(profile,{x=4,y=80,wall=false,unloaded=false,solid=false,rayError=false,parry=false,evade=false,accept=true,visualError=false,moveOnParry=false,auto=true}={}){
 let now=0;const hits=[],effects=[],self=[],heals=[],impulses=[],particles=[],notices=[],parries=[];
 const d={id:'realm',isChunkLoaded:()=>!unloaded,getBlock:()=>({isSolid:solid}),getBlockFromRay:()=>{if(rayError)throw Error('ray');return wall?{block:{}}:undefined},
  getEntities:()=>[mob],getPlayers:()=>[p],spawnParticle:(id,point)=>{if(visualError&&id.startsWith('hakkai:mob_'))throw Error('visual');particles.push([id,{...point}]);}};
 const p={id:'p',typeId:'minecraft:player',isValid:true,dimension:d,location:{x,y,z:0},getGameMode:()=>GameMode.Survival,
  sendMessage:m=>notices.push(m),applyDamage:n=>{hits.push(n);return accept},addEffect:e=>effects.push(e),applyImpulse:()=>{}};
 const mob={id:'m',typeId:'hakkai:'+profile.id,isValid:true,dimension:d,location:{x:0,y:80,z:0},playAnimation:()=>{},
  addEffect:e=>self.push(e),applyImpulse:v=>impulses.push(v),getComponent:()=>({currentValue:10,effectiveMax:100,setCurrentValue:n=>heals.push(n)})};
 const system={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[p]};
 const c=setupMobSystem({ns:'hakkai:',system,world,report:()=>{},num:()=>0,property:()=>{},isEvading:()=>evade,
  tryParry:()=>{parries.push('p');if(moveOnParry)p.location.x=12;return parry}});
 const go=n=>{now=system.currentTick=n;c.tick(p,n)};
 if(auto)for(const n of [0,120,160])go(n);
 return {p,mob,d,hits,effects,self,heals,impulses,particles,notices,parries,go,setWall:v=>wall=v};
}
for(const profile of drains){
 const line=profile.realm===7?'hakkai:mob_time':'hakkai:mob_shadow';
 test(`${profile.id}: warned unobstructed drain uses bounded line and keeps accepted-hit effects`,()=>{
  const f=fixture(profile);assert.equal(f.notices.length,1);assert.match(f.notices[0],/射線は遮蔽物で止まる/);
  assert.deepEqual(f.hits,[5+profile.variant]);assert.equal(f.parries.length,1);assert.ok(f.heals.includes(12+profile.variant*2));assert.ok(f.self.includes('speed'));
  const marks=f.particles.filter(([id])=>id===line);assert.ok(marks.length>=2&&marks.length<=11);assert.equal(marks[0][1].x,0);assert.equal(marks.at(-1)[1].x,4);
  for(const [,at] of marks)assert.ok(at.x>=0&&at.x<=4&&at.y>=80.55&&at.y<=80.9);
 });
 for(const mode of ['wall','unloaded','solid','rayError','high','range'])test(`${profile.id}: ${mode} prevents drain, healing and parry`,()=>{
  const opts=mode==='high'?{y:80+DRAIN_HEIGHT+.001}:mode==='range'?{x:DRAIN_RANGE}:{[mode]:true};
  const f=fixture(profile,opts);assert.equal(f.notices.length,1);assert.equal(f.hits.length,0);assert.equal(f.heals.length,0);assert.equal(f.impulses.length,0);assert.equal(f.parries.length,0);
  assert.equal(f.particles.filter(([id])=>id===line).length,0);
 });
 test(`${profile.id}: warning removal, parry, refused damage and cosmetic failure`,()=>{
  for(const opt of [{evade:true},{parry:true},{moveOnParry:true}]){
   const f=fixture(profile,opt);assert.equal(f.hits.length,0);assert.equal(f.heals.length,0);assert.equal(f.impulses.length,0);
   assert.equal(f.particles.filter(([id])=>id===line).length,0);
  }
  const denied=fixture(profile,{accept:false});assert.equal(denied.hits.length,1);assert.equal(denied.heals.length,0);assert.ok(!denied.self.includes('speed'));
  const visual=fixture(profile,{visualError:true});assert.equal(visual.hits.length,1);assert.ok(visual.heals.length);
  const blocked=fixture(profile,{auto:false});blocked.go(0);blocked.go(120);blocked.setWall(true);blocked.go(160);assert.equal(blocked.hits.length,0);assert.equal(blocked.parries.length,0);
  const escaped=fixture(profile,{auto:false});escaped.go(0);escaped.go(120);escaped.p.location.x=12;escaped.go(160);assert.equal(escaped.hits.length,0);
 });
}
test('drain range and height boundaries',()=>{
 assert.equal(DRAIN_RANGE,8);assert.equal(DRAIN_HEIGHT,3);
 for(const y of [77,83])assert.equal(fixture(drains[0],{x:7.999,y}).hits.length,1);
 for(const y of [76.999,83.001])assert.equal(fixture(drains[0],{x:7.999,y}).hits.length,0);
 assert.equal(fixture(drains[0],{x:8}).hits.length,0);
});
test('drain visual rejects malformed or oversized lines and isolates missing particles',()=>{
 const calls=[],e={location:{x:0,y:0,z:0},dimension:{spawnParticle:(...v)=>calls.push(v)}};
 drainLink(e,{location:{x:50,y:0,z:0}},0);drainLink(e,{location:{x:NaN,y:0,z:0}},0);assert.equal(calls.length,0);
 e.dimension.spawnParticle=()=>{throw Error('missing particle')};assert.doesNotThrow(()=>drainLink(e,{location:{x:4,y:0,z:0}},0));
});
