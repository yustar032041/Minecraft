// Actual controller with mocked dimension/AI. These do not verify Bedrock
// collision shapes, particles, targeting, multiplayer or balance.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Difficulty,GameMode} from '@minecraft/server';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {RUSH_HEIGHT} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_rush_line.js';
import {GUARD_STYLES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_guard_styles.js';
const guards=mobContentList.filter(p=>p.temper==='hostile'&&['ward','armor'].includes(p.talent));
assert.equal(guards.length,18);
assert.deepEqual(Object.keys(GUARD_STYLES).sort(),guards.map(p=>p.id).sort());
function fixture(profile,{x=.65,y=80,wall=false,unloaded=false,solid=false,rayError=false,parry=false,evade=false,accept=true,visualError=false,auto=true,moveOnBuff=false}={}){
 let t=0,players=[];const hits=[],victimEffects=[],selfEffects=[],allyEffects=[],outsideEffects=[],parries=[],particles=[],notices=[],anims=[];
 const d={id:'realm',isChunkLoaded:()=>!unloaded,getBlock:()=>({isSolid:solid}),getBlockFromRay:()=>{if(rayError)throw Error('unavailable');return wall?{block:{}}:undefined},
  getEntities:q=>q.families?[mob,ally,outsider]:[mob],getPlayers:()=>players,spawnParticle:(id,at)=>{if(visualError&&id.startsWith('hakkai:mob_'))throw Error('visual');particles.push([id,{...at}]);}};
 const p={id:'p',typeId:'minecraft:player',isValid:true,dimension:d,location:{x,y,z:0},getGameMode:()=>GameMode.Survival,
  sendMessage:m=>notices.push(m),applyDamage:n=>{hits.push(n);return accept},addEffect:e=>victimEffects.push(e),applyImpulse:()=>{}};
 const mob={id:'mob',typeId:'hakkai:'+profile.id,isValid:true,dimension:d,location:{x:0,y:80,z:0},
  addEffect:e=>{selfEffects.push(e);if(moveOnBuff)p.location.x=8;},playAnimation:id=>anims.push(id),applyImpulse:()=>{},getComponent:()=>({currentValue:10,effectiveMax:20,setCurrentValue:()=>{}})};
 const ally={id:'ally',typeId:`hakkai:wild_${profile.realm}_1`,isValid:true,addEffect:e=>allyEffects.push(e)};
 const outsider={id:'outsider',typeId:`hakkai:wild_${(profile.realm+1)%8}_1`,isValid:true,addEffect:e=>outsideEffects.push(e)};
 players=[p];const system={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>players};
 const ctrl=setupMobSystem({ns:'hakkai:',system,world,num:()=>0,property:()=>{},report:()=>{},isEvading:()=>evade,tryParry:()=>{parries.push('p');return parry}});
 const go=(n,viewer=p)=>{t=system.currentTick=n;ctrl.tick(viewer,n)};
 if(auto)for(const n of [0,120,160])go(n);
 return {p,mob,d,hits,victimEffects,selfEffects,allyEffects,outsideEffects,parries,particles,notices,anims,go,setWall:v=>wall=v,addPlayer:other=>players.push(other)};
}
function assertBuff(f,profile){
 assert.ok(f.selfEffects.includes('resistance'),profile.id);
 if(profile.talent==='armor'){assert.ok(f.selfEffects.includes('strength'));assert.deepEqual(f.allyEffects,[]);}
 else {assert.ok(f.allyEffects.includes('resistance'));if(GUARD_STYLES[profile.id].trait!=='strength')assert.ok(!f.selfEffects.includes('strength'));}
 assert.ok(f.selfEffects.includes(GUARD_STYLES[profile.id].trait));
 assert.deepEqual(f.outsideEffects,[]);
}
for(const profile of guards){
 test(`${profile.id}: close hit and correct self/ally buff`,()=>{
  const f=fixture(profile);assert.equal(f.notices.length,0);assert.equal(f.particles.filter(([id])=>id==='hakkai:warning_marker').length,0);
  assert.equal(f.hits.length,1);assert.equal(f.parries.length,1);assertBuff(f,profile);
  const mark=f.particles.filter(([id])=>id==='hakkai:mob_impact');assert.equal(mark.length,1);assert.equal(mark[0][1].x,.65);
 });
 for(const mode of ['far','wall','unloaded','solid','rayError','high'])test(`${profile.id}: ${mode} has buff but no body hit or parry`,()=>{
  const opts=mode==='far'?{x:3}:mode==='high'?{y:80+RUSH_HEIGHT+.001}:{[mode]:true};
  const f=fixture(profile,opts);assert.equal(f.hits.length,0);assert.equal(f.parries.length,0);assert.equal(f.victimEffects.length,0);assertBuff(f,profile);
  assert.equal(f.particles.filter(([id])=>id==='hakkai:mob_impact').length,0);
 });
 test(`${profile.id}: parry or evade cancels; refused damage leaves buff but no hit effects`,()=>{
  for(const opt of [{parry:true},{evade:true}]){const f=fixture(profile,opt);assert.equal(f.hits.length,0);assert.equal(f.selfEffects.length,0);assert.equal(f.allyEffects.length,0);}
  const f=fixture(profile,{accept:false});assert.equal(f.hits.length,1);assert.equal(f.victimEffects.length,0);assertBuff(f,profile);
  assert.equal(f.particles.filter(([id])=>id==='hakkai:mob_impact').length,0);
  const visual=fixture(profile,{visualError:true});assert.equal(visual.hits.length,1);assertBuff(visual,profile);
 });
 test(`${profile.id}: a second player scan cannot redirect or duplicate the warned strike`,()=>{
  const f=fixture(profile,{auto:false});let otherHits=0,otherNotices=0;
  const q={...f.p,id:'q',location:{x:2.1,y:80,z:0},sendMessage:()=>otherNotices++,applyDamage:()=>{otherHits++;return true}};f.addPlayer(q);
  f.go(0);f.go(120);f.go(160,q);f.go(160);assert.equal(f.hits.length,1);assert.equal(otherHits,0);assert.equal(otherNotices,0);assertBuff(f,profile);
 });
 test(`${profile.id}: rechecks geometry on resolution and after a buff callback`,()=>{
  const f=fixture(profile,{auto:false});f.go(0);f.go(120);f.setWall(true);f.go(160);assert.equal(f.hits.length,0);assert.equal(f.parries.length,0);assertBuff(f,profile);
  const changed=fixture(profile,{moveOnBuff:true});assert.equal(changed.hits.length,0,'target moved after the parry check');assertBuff(changed,profile);
  const left=fixture(profile,{auto:false});left.go(0);left.go(120);left.p.location.x=12;left.go(160);assert.equal(left.hits.length,0);assertBuff(left,profile);
  const moved=fixture(profile,{x:6,auto:false});moved.go(0);moved.go(120);moved.p.location.x=.65;moved.go(160);assert.equal(moved.hits.length,1,'close body hit is not limited by the former floor circle');
 });
}
test('exact physical reach and elevation boundaries',()=>{
 for(const p of guards){const reach=GUARD_STYLES[p.id].reach;
  for(const y of [80-RUSH_HEIGHT,80+RUSH_HEIGHT])assert.equal(fixture(p,{x:reach,y}).hits.length,1);
  for(const y of [80-RUSH_HEIGHT-.001,80+RUSH_HEIGHT+.001])assert.equal(fixture(p,{x:reach,y}).hits.length,0);
  assert.equal(fixture(p,{x:reach+.001}).hits.length,0);
 }
});
