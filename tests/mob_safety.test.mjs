// Simulation: these tests exercise the actual scripted combat controller, not
// Bedrock's rendering, networking, damage pipeline, or entity AI.
import assert from 'node:assert/strict';
import {start as movingStart} from './moving_attack_fixture.mjs';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {BODY_RUSH} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_body_rush.js';
import {GUARD_STYLES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_guard_styles.js';
import {creatureVisualAnimation} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_visual_styles.js';
import {kingWarningMarkerCount} from '../Hakkai_v7.1.0/BehaviorPack/scripts/attack_warning.js';
import {Difficulty,GameMode} from '@minecraft/server';
function fixture(type, options={}){
 const effects=[],pushes=[],mobPushes=[],hits=[],markers=[],messages=[],animations=[];
 const d={id:'hakkai:realm_0',isChunkLoaded:()=>true,getBlock:()=>({isSolid:false}),getBlockFromRay:()=>undefined,getEntities:()=>[mob],getPlayers:()=>[p],spawnParticle:(id,loc)=>{if((options.noParticle&&id==='hakkai:warning_marker')||(options.noTalentParticle&&id.startsWith('hakkai:mob_')))throw Error('unavailable');markers.push({id,loc,tick:system.currentTick});}};
 const reach=BODY_RUSH[type.replace('hakkai:','')]?.reach??GUARD_STYLES[type.replace('hakkai:','')]?.reach;
 const p={id:'player',typeId:'minecraft:player',isValid:true,location:{x:reach?reach-.1:2,y:80,z:0},dimension:d,getGameMode:()=>GameMode.Survival,
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
for(const mob of hostile.filter(p=>['leap','charge','armor','ward'].includes(p.talent))){
 const accepted=fixture('hakkai:'+mob.id);for(const t of [0,120,160])accepted.tick(t);assert.ok(accepted.hits.length,`${mob.id} lands its close-range attack`);
 const body=['leap','charge','armor','ward','burst'].includes(mob.talent);
 if(body)assert.equal(accepted.messages.length,0,`${mob.id} body attack has no chat warning`);
 else assert.ok(accepted.messages[0].includes('上下3ブロック')&&accepted.messages[0].includes(mob.talent==='burst'?'通知を受けた人が対象':'あなたのみ対象'),`${mob.id} warning states height and audience`);
 assert.deepEqual(accepted.animations,[[120,creatureVisualAnimation(mob,'windup')],[160,creatureVisualAnimation(mob,'strike')]],`${mob.id} animations follow warning and real strike`);
 const tells=accepted.markers.filter(m=>m.id.startsWith('hakkai:tell_'));
 assert.equal(tells.length,8,`${mob.id} source flash`);assert.ok(tells.every(m=>m.tick===120));
 const noTell=fixture('hakkai:'+mob.id);const spawn=noTell.d.spawnParticle;
 noTell.d.spawnParticle=(id,pos)=>{if(id.startsWith('hakkai:tell_'))throw Error('unavailable');spawn(id,pos);};
 for(const t of [0,120,160])noTell.tick(t);assert.deepEqual(noTell.hits,accepted.hits,`${mob.id} cosmetic failure does not alter damage`);
 const broken=fixture('hakkai:'+mob.id,{noAnimation:true});for(const t of [0,120,160])broken.tick(t);
 assert.deepEqual(broken.hits,accepted.hits,`${mob.id}: animation failure cannot alter damage`);
 const f=fixture('hakkai:'+mob.id,{refuseDamage:true});
 for(const t of [0,120,160])f.tick(t);
 assert.equal(f.markers.filter(x=>x.id==='hakkai:warning_marker').length,body?0:16,`${mob.id} body attacks do not use a floor warning`);
 assert.deepEqual(f.effects,[],`${mob.id}: rejected damage cannot add player effects`);
 assert.deepEqual(f.pushes,[],`${mob.id}: rejected damage cannot push player`);
}
// Moving burst geometry, multiplayer, parry and cosmetic failure checks are
// exercised by mob_burst_contact and mob_burst_multiplayer.
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

// Moving hound and drain behavior is exercised with an actual scheduled ray
// fixture in mob_moving_projectiles.test.mjs and mob_drain_line.test.mjs.

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
console.log(`Mob safety: body/pulse and king checks; moving shots tested separately (simulated)`);

// Creature-specific moving shots keep their selected primary effect and palette.
for(const [id,talent,effect,color] of [
 ['foe_1_6','web','slowness','spore'],['foe_2_6','web','slowness','sand'],
 ['foe_3_5','frost','mining_fatigue','frost'],['foe_4_5','shock','weakness','spark'],
 ['foe_4_6','shock','weakness','spark'],['foe_5_6','web','slowness','shadow'],
 ['foe_6_6','web','slowness','wind'],['foe_7_6','time','slowness','time'],
 ['foe_4_11','shock','weakness','spark'],['foe_6_11','gust',null,'wind'],
 ['foe_0_4','leech',null,'shadow'],['foe_1_4','leech',null,'shadow'],
 ['foe_2_4','mark','weakness','time'],['foe_3_4','frost','mining_fatigue','frost'],
 ['foe_4_4','shock','weakness','spark'],['foe_5_4','leech',null,'shadow'],
 ['foe_6_4','gust',null,'wind'],['foe_7_4','time','slowness','time'],['foe_1_11','web','slowness','spore'],
]){
 const profile=hostile.find(m=>m.id===id);assert.equal(profile?.talent,talent,id);
 const f=movingStart(profile);f.advance(175);assert.equal(f.hits.length,1,id);
 if(effect)assert.ok(f.effects.includes(effect),id);if(talent==='leech')assert.ok(f.heals.length,id);
 assert.ok(f.particles.some(([t,p])=>t>160&&p===`hakkai:shot_${color}`),id);
}
for(const [id,power] of [['foe_0_4',.18],['foe_1_4',.2],['foe_5_4',.22]]){
 const profile=hostile.find(m=>m.id===id),f=movingStart(profile);f.advance(175);
 assert.equal(f.hits.length,1,id);assert.equal(f.impulses.length,1,id);assert.ok(Math.abs(f.impulses[0].x-power)<1e-9);
 const refused=movingStart(profile,{reject:true});refused.advance(175);assert.deepEqual(refused.impulses,[]);
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
