// Mocked ray/AI tests for the existing impulse-based skills; actual Bedrock
// hitboxes, terrain, physics, animation blending and network remain untested.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameMode,Difficulty} from '@minecraft/server';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {clearRushLine,RUSH_REACH,RUSH_HEIGHT} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_rush_line.js';
const rush=mobContentList.filter(p=>p.temper==='hostile'&&['leap','charge'].includes(p.talent));
assert.equal(rush.length,14);
function fixture(profile,{x=2,y=80,wall=false,unloaded=false,solid=false,throwRay=false,evade=false,parry=false,accept=true,particleFail=false,auto=true}={}){
 let tick=0;const hits=[],effects=[],motion=[],pushed=[],particles=[],animations=[],notices=[],parries=[];
 const dimension={id:'r',isChunkLoaded:()=>!unloaded,getBlock:()=>({isAir:!solid,isLiquid:false,...(solid?{isSolid:true}:{})}),getBlockFromRay:(from,dir,options)=>{if(throwRay)throw Error('ray');return wall?{block:{}}:undefined;},
  getEntities:()=>[mob],getPlayers:()=>[p],spawnParticle:(id,pos)=>{if(particleFail&&id.startsWith('hakkai:mob_'))throw Error('visual');particles.push([tick,id,{...pos}]);}};
 const p={id:'p',typeId:'minecraft:player',isValid:true,dimension,location:{x,y,z:0},getGameMode:()=>GameMode.Survival,
  sendMessage:m=>notices.push(m),applyDamage:n=>{hits.push(n);return accept},addEffect:e=>effects.push(e),applyImpulse:v=>pushed.push(v)};
 const mob={id:'mob',typeId:'hakkai:'+profile.id,isValid:true,dimension,location:{x:0,y:80,z:0},playAnimation:id=>animations.push(id),
  applyImpulse:v=>motion.push(v),addEffect:()=>{},getComponent:()=>({currentValue:10,effectiveMax:20,setCurrentValue:()=>{}})};
 const system={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[p]};
 const ctrl=setupMobSystem({ns:'hakkai:',system,world,report:()=>{},num:()=>0,property:()=>{},isEvading:()=>evade,tryParry:()=>{parries.push('p');return parry}});
 const go=n=>{tick=system.currentTick=n;ctrl.tick(p,n)};
 if(auto)for(const n of [0,120,160])go(n);
 return {dimension,p,mob,hits,effects,motion,pushed,particles,animations,notices,parries,go,setWall:value=>wall=value};
}
for(const profile of rush){
 test(`${profile.id}: close visible target is hit; far target only causes movement`,()=>{
  const close=fixture(profile);assert.equal(close.notices.length,1);assert.match(close.notices[0],/近距離のみ命中・遮蔽物や高低差で不発/);assert.equal(close.hits.length,1);assert.ok(close.pushed.length>=1); // signature can add a second push
  assert.equal(close.motion.length,0,'close strike does not also propel into the target');
  const impact=close.particles.filter(([,id])=>id==='hakkai:mob_impact');assert.equal(impact.length,4);
  assert.ok(impact.slice(0,3).every(([,id,pos])=>Math.hypot(pos.x,pos.z)<=.45+1e-9),'movement sparks at mob');
  assert.equal(impact[3][2].x,2,'accepted hit has an impact at the target');
  const far=fixture(profile,{x:4.5});assert.equal(far.notices.length,1);assert.equal(far.hits.length,0);assert.equal(far.pushed.length,0);assert.equal(far.motion.length,1);
  assert.equal(far.particles.filter(([,id])=>id==='hakkai:mob_impact').length,3,'no fake distant hit');
 });
 for(const mode of ['wall','unloaded','solid','throwRay','too-high'])test(`${profile.id}: ${mode} cancels movement and strike before parry`,()=>{
  const opts=mode==='too-high'?{y:80+RUSH_HEIGHT+.001}:{[mode]:true},f=fixture(profile,opts);
  assert.equal(f.notices.length,1);assert.equal(f.hits.length,0);assert.equal(f.motion.length,0);assert.equal(f.pushed.length,0);assert.equal(f.parries.length,0);
 });
 test(`${profile.id}: windup rechecks wall, elevation and moving target`,()=>{
  const f=fixture(profile,{auto:false});f.go(0);f.go(120);assert.equal(f.notices.length,1);f.setWall(true);f.go(160);
  assert.equal(f.hits.length,0);assert.equal(f.motion.length,0);assert.equal(f.parries.length,0);
  const high=fixture(profile,{auto:false});high.go(0);high.go(120);high.p.location.y=81.501;high.go(160);
  assert.equal(high.hits.length,0);assert.equal(high.motion.length,0);assert.equal(high.parries.length,0);
  const sidestep=fixture(profile,{auto:false});sidestep.go(0);sidestep.go(120);sidestep.p.location.x=3;sidestep.go(160);
  assert.equal(sidestep.hits.length,0,'outside close reach');assert.equal(sidestep.motion.length,1,'still inside original warning and can advance');
  const left=fixture(profile,{auto:false});left.go(0);left.go(120);left.p.location.x=10;left.go(160);
  assert.equal(left.hits.length,0);assert.equal(left.motion.length,0,'leaving the warning cancels pursuit');
 });
 test(`${profile.id}: evade/parry/rejected damage and visual failures`,()=>{
  for(const option of [{evade:true},{parry:true}]){const f=fixture(profile,option);assert.equal(f.hits.length,0);assert.equal(f.motion.length,0);}
  const refused=fixture(profile,{accept:false});assert.equal(refused.hits.length,1);assert.equal(refused.pushed.length,0);assert.equal(refused.effects.length,0);
  assert.equal(refused.particles.filter(([,id])=>id==='hakkai:mob_impact').length,3);
  const broken=fixture(profile,{particleFail:true});assert.equal(broken.hits.length,1,'cosmetic failure must not suppress hit');
 });
}
test('line and reach boundaries, dimension, block and unavailable API failures',()=>{
 const f=fixture(rush[0]);assert.equal(RUSH_REACH,2.25);assert.equal(RUSH_HEIGHT,1.5);
 f.p.location.y=81.5;assert.equal(clearRushLine(f.mob,f.p),true);f.p.location.y=81.501;assert.equal(clearRushLine(f.mob,f.p),false);
 f.p.location.y=80;f.p.dimension={id:'other'};assert.equal(clearRushLine(f.mob,f.p),false);
 f.p.dimension=f.dimension;f.dimension.isChunkLoaded=at=>at.x<.5||at.x>1.5;assert.equal(clearRushLine(f.mob,f.p),false,'intermediate unloaded segment');
 f.dimension.isChunkLoaded=()=>true;f.dimension.getBlock=()=>({});assert.equal(clearRushLine(f.mob,f.p),false);
 f.dimension.getBlock=()=>undefined;assert.equal(clearRushLine(f.mob,f.p),false);
 f.dimension.getBlock=()=>({isSolid:false});f.dimension.getBlockFromRay=undefined;assert.equal(clearRushLine(f.mob,f.p),false);
 const edge=fixture(rush[0],{x:RUSH_REACH});assert.equal(edge.hits.length,1);
 const beyond=fixture(rush[0],{x:RUSH_REACH+.001});assert.equal(beyond.hits.length,0);assert.equal(beyond.motion.length,1);
});
