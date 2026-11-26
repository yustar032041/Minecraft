// Simulation: these tests exercise the actual scripted combat controller, not
// Bedrock's rendering, networking, damage pipeline, or entity AI.
import assert from 'node:assert/strict';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {creatureVisualAnimation} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_visual_styles.js';
import {kingWarningMarkerCount} from '../Hakkai_v7.1.0/BehaviorPack/scripts/attack_warning.js';
import {Difficulty,GameMode} from '@minecraft/server';
function fixture(type, options={}){
 const effects=[],pushes=[],mobPushes=[],hits=[],markers=[],messages=[],animations=[];
 const d={id:'hakkai:realm_0',isChunkLoaded:()=>true,getBlock:()=>({isSolid:false}),getBlockFromRay:()=>undefined,getEntities:()=>[mob],getPlayers:()=>[p],spawnParticle:(id,loc)=>{if((options.noParticle&&id==='hakkai:warning_marker')||(options.noTalentParticle&&id.startsWith('hakkai:mob_')))throw Error('unavailable');markers.push({id,loc,tick:system.currentTick});}};
 const p={id:'player',typeId:'minecraft:player',isValid:true,location:{x:2,y:80,z:0},dimension:d,getGameMode:()=>GameMode.Survival,
  sendMessage:m=>{if(options.noMessage)throw Error('offline');messages.push(m)},applyDamage:n=>{hits.push(n);if(options.throwDamage)throw Error('damage');return !options.refuseDamage},
  applyImpulse:v=>pushes.push(v),addEffect:(id)=>effects.push(id)};
 const mob={id:'mob',typeId:type,isValid:true,location:{x:0,y:80,z:0},dimension:d,applyImpulse:v=>mobPushes.push(v),addEffect:()=>{},getComponent:()=>({currentValue:5000,effectiveMax:5000,setCurrentValue:()=>{}}),playAnimation:id=>{animations.push([system.currentTick,id]);if(options.noAnimation)throw Error('animation unavailable');}};
 const system={currentTick:0},world={difficulty:Difficulty.Normal,getDifficulty(){return this.difficulty},getAllPlayers:()=>[p]};
 const controller=setupMobSystem({ns:'hakkai:',world,system,num:()=>0,property:()=>{},report:()=>assert.fail('unexpected report'),...options.ctx});
 const tick=t=>{system.currentTick=t;controller.tick(p,t)};
 return {d,p,mob,system,world,controller,tick,effects,pushes,mobPushes,hits,markers,messages,animations};
}
const hostile=mobContentList.filter(m=>m.temper==='hostile');
assert.equal(hostile.length,104);
for(const mob of hostile){
 const accepted=fixture('hakkai:'+mob.id);for(const t of [0,120,160])accepted.tick(t);assert.ok(accepted.hits.length,`${mob.id} lands its close-range attack`);
 assert.ok(accepted.messages[0].includes('上下3ブロック')&&accepted.messages[0].includes(mob.talent==='burst'?'通知を受けた人が対象':'あなたのみ対象'),`${mob.id} warning states height and audience`);
 assert.deepEqual(accepted.animations,[[120,creatureVisualAnimation(mob,'windup')],[160,creatureVisualAnimation(mob,'strike')]],`${mob.id} animations follow warning and real strike`);
 const broken=fixture('hakkai:'+mob.id,{noAnimation:true});for(const t of [0,120,160])broken.tick(t);
 assert.deepEqual(broken.hits,accepted.hits,`${mob.id}: animation failure cannot alter damage`);
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

{
 // The target is warned; bystanders must independently receive the warning
 // before they can be hurt. A newcomer cannot enter during the windup and
 // be hit by a warning they never saw.
 const f=fixture('hakkai:'+burst.id),events=[];
 const failed={...f.p,id:'failed-notice',location:{x:3,y:80,z:0},sendMessage:()=>{throw Error('offline')},applyDamage:()=>{events.push('failed');return true}};
 const late={...f.p,id:'late-arrival',location:{x:3,y:80,z:0},applyDamage:()=>{events.push('late');return true}};
 f.d.getPlayers=()=>[f.p,failed];f.world.getAllPlayers=()=>[f.p,failed];
 for(const t of [0,120])f.tick(t);
 f.d.getPlayers=()=>[f.p,failed,late];f.world.getAllPlayers=()=>[f.p,failed,late];f.tick(160);
 assert.equal(f.hits.length,1);assert.deepEqual(events,[]);
}
{
 const f=fixture('hakkai:'+burst.id);let warned=0,hit=0;
 const q={...f.p,id:'other',location:{x:3,y:80,z:0},sendMessage:()=>warned++,applyDamage:()=>{hit++;return true},applyImpulse:()=>{},addEffect:()=>{}};
 f.d.getPlayers=()=>[f.p,q];f.world.getAllPlayers=()=>[f.p,q];for(const t of [0,120,160])f.tick(t);
 assert.equal(warned,1);assert.equal(hit,1);
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

// New time hound and heavy beast advance only when the already-warned attack
// resolves on time against a valid player. It is not a damaging dash path.
for(const [id,power] of [['foe_7_0',.32],['foe_7_10',.22]]){
 const f=fixture('hakkai:'+id);f.p.location.x=4;for(const t of [0,120,160])f.tick(t);
 assert.equal(f.mobPushes.length,1,id);assert.ok(Math.abs(f.mobPushes[0].x-power)<1e-9);assert.equal(f.mobPushes[0].z,0);assert.ok(f.hits.length);
 for(const options of [{noParticle:true},{ctx:{tryParry:()=>true}}]){
  const fail=fixture('hakkai:'+id,options);fail.p.location.x=4;for(const t of [0,120,160])fail.tick(t);
  assert.equal(fail.mobPushes.length,0,`${id} must not advance on canceled/parried attack`);
 }
 const missed=fixture('hakkai:'+id);missed.p.location.x=4;for(const t of [0,120])missed.tick(t);missed.p.location.x=12;missed.tick(160);assert.equal(missed.mobPushes.length,0);
 const visual=fixture('hakkai:'+id,{noTalentParticle:true,noAnimation:true});visual.p.location.x=4;for(const t of [0,120,160])visual.tick(t);
 assert.deepEqual(visual.hits,f.hits,'cosmetic failures do not change damage');
}
{
 const f=fixture('hakkai:foe_6_8');for(const t of [0,120,160])f.tick(t);
 assert.ok(f.hits.length);assert.equal(f.pushes.length,1);assert.equal(f.pushes[0].y,.35);
 assert.ok(Math.abs(f.pushes[0].x-1.35)<1e-9);
 const refused=fixture('hakkai:foe_6_8',{refuseDamage:true});for(const t of [0,120,160])refused.tick(t);assert.deepEqual(refused.pushes,[]);
}

{
 // Final phase runs all nine existing techniques. Check the actual controller
 // dispatch, rather than only the style lookup in isolation.
 const f=fixture('hakkai:eclipse_colossus');f.mob.getComponent=()=>({currentValue:1000,effectiveMax:5000,setCurrentValue:()=>{}});
 for(let t=0;t<=1800;t+=40)f.tick(t);
 for(const style of ['cleave','cast','wave'])for(const phase of ['windup','strike'])
  assert.ok(f.animations.some(([,id])=>id===`animation.hakkai.eclipse_${style}_${phase}`),`${style}/${phase}`);
 assert.ok(f.markers.some(x=>x.id.startsWith('hakkai:mob_')),'king receives bounded impact visuals');
 const broken=fixture('hakkai:eclipse_colossus',{noAnimation:true,noTalentParticle:true});for(const t of [0,120,160])broken.tick(t);
 const ok=fixture('hakkai:eclipse_colossus');for(const t of [0,120,160])ok.tick(t);
 assert.deepEqual(broken.hits,ok.hits,'boss visual failures do not change damage');
 const delayed=fixture('hakkai:eclipse_colossus');for(const t of [0,120,200])delayed.tick(t);
 assert.equal(delayed.markers.filter(x=>x.id.startsWith('hakkai:mob_')).length,0,'late boss attack does not show a strike');
}
console.log(`Mob safety: ${hostile.length} hostile profiles, warning bounds, cancellation, peaceful and rejected damage OK (simulated)`);

// Creature-specific thematic changes use the existing warned single-target
// mechanics. These checks cover actual dispatch and visual choice, not only
// metadata; Bedrock physics and rendered colors still require device testing.
for(const [id,talent,effect,particleKind] of [
 ['foe_1_6','web','slowness','spore'],['foe_2_6','web','slowness','sand'],
 ['foe_3_5','frost','mining_fatigue','frost'],['foe_4_5','shock','weakness','spark'],
 ['foe_4_6','shock','weakness','spark'],['foe_5_6','web','slowness','shadow'],
 ['foe_6_6','web','slowness','wind'],['foe_7_6','time','slowness','time'],
 ['foe_2_11','charge',null,'impact'],['foe_4_11','shock','weakness','spark'],
 ['foe_6_11','gust',null,'wind'],
]){
 const profile=hostile.find(m=>m.id===id);assert.equal(profile?.talent,talent,id);
 const f=fixture('hakkai:'+id);for(const t of [0,120,160])f.tick(t);
 assert.ok(f.hits.length,`${id} strikes`);if(effect)assert.ok(f.effects.includes(effect),`${id} applies ${effect}`);
 if(talent==='charge'){assert.equal(f.mobPushes.length,0,'close contact does not also propel into the target');assert.ok(f.pushes.length,`${id} pushes`);}
 if(talent==='gust')assert.ok(f.pushes.length,`${id} pushes`);
 assert.equal(f.markers.filter(x=>x.id===`hakkai:mob_${particleKind}`).length,4,`${id} fixed-area plus accepted contact`);
 for(const options of [{noParticle:true},{noMessage:true},{refuseDamage:true},{ctx:{tryParry:()=>true}}]){
  const canceled=fixture('hakkai:'+id,options);for(const t of [0,120,160])canceled.tick(t);
  assert.deepEqual(canceled.effects,[],`${id} canceled effects`);assert.deepEqual(canceled.pushes,[],`${id} canceled pushes`);
  if(!options.refuseDamage)assert.equal(canceled.hits.length,0,`${id} cancels unannounced or parried attack`);
 }
 const escaped=fixture('hakkai:'+id);for(const t of [0,120])escaped.tick(t);escaped.p.location.x=20;escaped.tick(160);
 assert.equal(escaped.hits.length,0,`${id} escaped warning`);
}

// Scripted shock/spore target a single player and burst uses the warning
// around its locked aim. Do not display a second, misleading area at the
// mob or moving victim. A single post-hit contact spark and climate echoes
// remain cosmetic; no extra 16-point climate ring is emitted by these moves.
for(const id of ['foe_4_5','foe_0_5','foe_6_8']){
 const f=fixture('hakkai:'+id);for(const t of [0,120,160])f.tick(t);
 assert.ok(f.hits.length,id);
 assert.ok(f.markers.filter(x=>x.id.startsWith('hakkai:climate_')).length<=2,`${id} emits no misleading second ring`);
}

// Individual foxes and the forest web-weaver no longer all reuse web/burst.
// Signature echoes are intentionally retained, so assert primary effects
// without assuming they are the only effect on a successful hit.
for(const [id,talent,effect,visual] of [
 ['foe_0_4','leech',null,'impact'],['foe_1_4','leech',null,'impact'],
 ['foe_2_4','mark','weakness','time'],['foe_3_4','frost','mining_fatigue','frost'],
 ['foe_4_4','shock','weakness','spark'],['foe_5_4','leech',null,'impact'],
 ['foe_6_4','gust',null,'wind'],['foe_7_4','time','slowness','time'],
 ['foe_1_11','web','slowness','spore'],
]){
 const profile=hostile.find(m=>m.id===id);assert.equal(profile?.talent,talent,id);
 const f=fixture('hakkai:'+id),heals=[];
 f.mob.getComponent=()=>({currentValue:10,effectiveMax:20,setCurrentValue:n=>heals.push(n)});
 for(const t of [0,120,160])f.tick(t);
 assert.ok(f.hits.length,`${id} lands`);if(effect)assert.ok(f.effects.includes(effect),`${id} applies ${effect}`);
 if(talent==='leech')assert.ok(heals.length,`${id} heals only on hit`);
 if(talent==='gust')assert.ok(f.pushes.length,`${id} pushes`);
 assert.equal(f.markers.filter(x=>x.id===`hakkai:mob_${visual}`).length,talent==='leech'?3:4,id);
 for(const options of [{noParticle:true},{noMessage:true},{refuseDamage:true},{ctx:{tryParry:()=>true}}]){
  const c=fixture('hakkai:'+id,options),badHeals=[];c.mob.getComponent=()=>({currentValue:10,effectiveMax:20,setCurrentValue:n=>badHeals.push(n)});
  for(const t of [0,120,160])c.tick(t);
  assert.deepEqual(c.effects,[],`${id}: canceled effects`);assert.deepEqual(c.pushes,[],`${id}: canceled pushes`);assert.deepEqual(badHeals,[],`${id}: canceled healing`);
  if(!options.refuseDamage)assert.equal(c.hits.length,0,`${id}: no unannounced or parried hit`);
 }
 const escaped=fixture('hakkai:'+id);for(const t of [0,120])escaped.tick(t);escaped.p.location.x=20;escaped.tick(160);
 assert.equal(escaped.hits.length,0,`${id}: left warning`);
}

// The three shadow hunters make a very small move only after their existing
// warned, un-parried, accepted leech hit. It is not a damage-bearing dash.
for(const [id,power] of [['foe_0_4',.18],['foe_1_4',.2],['foe_5_4',.22]]){
 const f=fixture('hakkai:'+id);f.p.location.x=4;for(const t of [0,120,160])f.tick(t);
 assert.equal(f.hits.length,1,id);assert.equal(f.mobPushes.length,1,id);
 assert.ok(Math.abs(f.mobPushes[0].x-power)<1e-9);assert.equal(f.mobPushes[0].z,0);assert.equal(f.mobPushes[0].y,.02);
 for(const options of [{noParticle:true},{noMessage:true},{refuseDamage:true},{throwDamage:true},{ctx:{tryParry:()=>true}}]){
  const c=fixture('hakkai:'+id,options);c.p.location.x=4;for(const t of [0,120,160])c.tick(t);
  assert.deepEqual(c.mobPushes,[],`${id}: no advance on cancellation or rejected damage`);
 }
 const close=fixture('hakkai:'+id);close.p.location.x=2;for(const t of [0,120,160])close.tick(t);assert.deepEqual(close.mobPushes,[],`${id}: no point-blank step`);
 const far=fixture('hakkai:'+id);far.p.location.x=7;for(const t of [0,120,160])far.tick(t);assert.ok(far.hits.length);assert.deepEqual(far.mobPushes,[],`${id}: no long step`);
 const missed=fixture('hakkai:'+id);missed.p.location.x=4;for(const t of [0,120])missed.tick(t);missed.p.location.x=20;missed.tick(160);assert.deepEqual(missed.mobPushes,[]);
 const late=fixture('hakkai:'+id);late.p.location.x=4;for(const t of [0,120,200])late.tick(t);assert.deepEqual(late.mobPushes,[]);
 const visual=fixture('hakkai:'+id,{noAnimation:true,noTalentParticle:true});visual.p.location.x=4;for(const t of [0,120,160])visual.tick(t);
 assert.deepEqual(visual.hits,f.hits);assert.deepEqual(visual.mobPushes,f.mobPushes,'cosmetic failure does not affect attack or movement');
}
{
 // A damage event may relocate or invalidate the target synchronously. The
 // hunter's step must not retarget to that new position after the hit.
 const f=fixture('hakkai:foe_1_4');f.p.location.x=4;
 f.p.applyDamage=()=>{f.p.location={x:-100,y:80,z:0};return true};
 for(const t of [0,120,160])f.tick(t);
 assert.equal(f.mobPushes.length,1);assert.ok(Math.abs(f.mobPushes[0].x-.2)<1e-9);
}

// Large king warnings have enough points to show their circular boundary more
// clearly without changing aim, damage area, timings or notification rules.
// The capped count remains a dotted outline and is not a visibility guarantee.
{
 const radii=[3.5,4,6,9,7,7,18,18,16],counts=[16,16,20,32,24,24,48,48,48];
 assert.deepEqual(radii.map(kingWarningMarkerCount),counts);
 assert.equal(kingWarningMarkerCount(Infinity),16);assert.equal(kingWarningMarkerCount(0),16);
 const f=fixture('hakkai:eclipse_colossus');f.mob.getComponent=()=>({currentValue:1000,effectiveMax:5000,setCurrentValue:()=>{}});
 for(let t=0;t<=1800;t+=40)f.tick(t);
 const starts=f.animations.filter(([,id])=>id.endsWith('_windup')).slice(0,9);
 assert.equal(starts.length,9);
 for(let i=0;i<9;i++){
  const at=starts[i][0],markers=f.markers.filter(m=>m.id==='hakkai:warning_marker'&&m.tick===at);
  assert.equal(markers.length,counts[i],`king warning ${i}`);
  const center=[3,5,6,7,8].includes(i)?f.mob.location:f.p.location;
  for(const m of markers){assert.ok(Math.abs(Math.hypot(m.loc.x-center.x,m.loc.z-center.z)-radii[i])<1e-9);assert.equal(m.loc.y,center.y+.15);}
 }
}
{
 // Fail a marker only after the old 16-point budget, during the fourth
 // (large) attack. A partial outline must still cancel the whole strike.
 const f=fixture('hakkai:eclipse_colossus');let seen=0;
 const original=f.d.spawnParticle;
 f.d.spawnParticle=(id,loc)=>{if(id==='hakkai:warning_marker'&&f.system.currentTick===480&&++seen===17)throw Error('particle budget');original(id,loc);};
 // With the regular 40-tick controller, boss attacks start at 120, 240,
 // 360 and 480; resolve would be 520.
 for(let t=0;t<=440;t+=40)f.tick(t);
 const before=f.hits.length;f.tick(480);f.tick(520);
 assert.equal(seen,17);assert.equal(f.hits.length,before,'partial large ring cancels the attack');
}
