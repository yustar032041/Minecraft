// Actual controller with mock damage/particles. No Bedrock renderer,
// networking, physical collision, block geometry or performance validation.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Difficulty,GameMode} from '@minecraft/server';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {isInstantMarkedTalent} from '../Hakkai_v7.1.0/BehaviorPack/scripts/attack_warning.js';
import {talentContact} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_talent_effects.js';
const profiles=mobContentList.filter(p=>p.temper==='hostile'&&isInstantMarkedTalent(p.talent));assert.equal(profiles.length,57);
const web=['shadow','spore','sand','frost','spark','shadow','wind','time'];
const colors={thorns:'impact',spore:'spore',frost:'frost',shock:'spark',time:'time',gust:'wind',mark:'time'};
const maximum={thorns:8,web:11,spore:12,frost:11,shock:13,time:14,gust:14,mark:16};
const damage=p=>({thorns:3+p.variant*2,web:2+p.variant,spore:2+p.variant,frost:3+p.variant,shock:4+p.variant*2,time:2+p.variant,gust:2+p.variant,mark:p.variant===2?4:2})[p.talent];
const primaryEffects={thorns:['slowness'],web:['slowness'],spore:['poison'],frost:['slowness','mining_fatigue'],shock:['weakness'],time:['slowness','weakness'],gust:[],mark:['weakness']};
function fixture(profile,{reject=false,throws=false,parry=false,evade=false,failContact=false,moveOnDamage=false}={}){
 const particles=[],hits=[],effects=[],pushes=[],notices=[],rays=[];
 const d={id:'realm',getEntities:()=>[mob],getPlayers:()=>[p],getBlockFromRay:()=>{rays.push(1);throw Error('these spells do not raycast blocks')},spawnParticle:(id,at)=>{
  if(failContact&&at.y===80.8&&id.startsWith('hakkai:mob_'))throw Error('contact unavailable');particles.push({id,at:{...at}});
 }};
 const p={id:'p',typeId:'minecraft:player',isValid:true,dimension:d,location:{x:2,y:80,z:0},getGameMode:()=>GameMode.Survival,
  sendMessage:m=>notices.push(m),applyDamage:n=>{hits.push(n);if(throws)throw Error('rejected');if(moveOnDamage)p.location.x=100;return !reject},
  addEffect:e=>effects.push(e),applyImpulse:impulse=>pushes.push(impulse)};
 const mob={id:'m',typeId:`hakkai:${profile.id}`,isValid:true,dimension:d,location:{x:0,y:80,z:0},playAnimation:()=>{},addEffect:()=>{},applyImpulse:()=>{},
  getComponent:()=>({currentValue:10,effectiveMax:20,setCurrentValue:()=>{}})};
 const system={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[p]};
 const ctrl=setupMobSystem({ns:'hakkai:',world,system,num:()=>0,property:()=>{},report:()=>{},isEvading:()=>evade,tryParry:()=>parry});
 const tick=t=>{system.currentTick=t;ctrl.tick(p,t)};
 return {p,mob,d,ctrl,tick,particles,hits,effects,pushes,notices,rays};
}
for(const profile of profiles){
 const kind=profile.talent==='web'?web[profile.realm]:colors[profile.talent],id=`hakkai:mob_${kind}`;
 test(`${profile.id}: fixed warning plus one accepted contact at the target`,()=>{
  const f=fixture(profile);f.tick(0);f.tick(120);assert.equal(f.notices.length,1);assert.match(f.notices[0],/輪内に即時発生・壁を貫通/);
  // Still inside the fixed warning; the new spark is at the actual victim.
  f.p.location.x=2.7;f.tick(160);assert.deepEqual(f.hits,[damage(profile)]);assert.equal(f.rays.length,0);
  for(const effect of primaryEffects[profile.talent])assert.ok(f.effects.includes(effect),effect);
  if(profile.talent==='gust')assert.ok(f.pushes.length>0);
  const same=f.particles.filter(x=>x.id===id);assert.equal(same.length,4);
  assert.ok(same.slice(0,3).every(x=>Math.abs(x.at.x-2)<=.45+1e-9));
  assert.deepEqual(same[3].at,{x:2.7,y:80.8,z:0});
  const index=mobContentList.indexOf(profile),guide=f.ctrl.fieldGuide(f.p,index);
  assert.match(guide,/予告円内に即時発生し、壁を貫通/);assert.match(guide,/移動する飛び道具ではありません/);
 });
 test(`${profile.id}: rejected, parried and escaped attacks never emit a contact`,()=>{
  for(const opt of [{reject:true},{throws:true},{parry:true},{evade:true}]){
   const f=fixture(profile,opt);f.tick(0);f.tick(120);f.p.location.x=2.7;f.tick(160);
   assert.equal(f.particles.filter(x=>x.id===id&&x.at.y===80.8).length,0);
   assert.equal(f.effects.length,0);if(opt.parry||opt.evade)assert.equal(f.hits.length,0);
  }
  const f=fixture(profile);f.tick(0);f.tick(120);f.p.location.x=12;f.tick(160);assert.equal(f.hits.length,0);
 });
 test(`${profile.id}: existing distance and fixed cylinder boundaries`,()=>{
  const reach=maximum[profile.talent],inside=fixture(profile);inside.p.location.x=reach-0.01;inside.tick(0);inside.tick(120);inside.tick(160);assert.deepEqual(inside.hits,[damage(profile)]);
  const boundary=fixture(profile);boundary.p.location.x=reach;boundary.tick(0);boundary.tick(120);boundary.tick(160);assert.equal(boundary.hits.length,0,'strict reach boundary');
  const vertical=fixture(profile);vertical.tick(0);vertical.tick(120);vertical.p.location.y+=3.01;vertical.tick(160);assert.equal(vertical.hits.length,0,'outside warning height');
 });
 test(`${profile.id}: post-hit teleport and particle failure do not retarget or alter damage`,()=>{
  const moved=fixture(profile,{moveOnDamage:true});moved.tick(0);moved.tick(120);moved.p.location.x=2.7;moved.tick(160);
  assert.equal(moved.hits.length,1);assert.ok(moved.particles.some(x=>x.id===id&&x.at.x===2.7&&x.at.y===80.8));
  const missing=fixture(profile,{failContact:true}),normal=fixture(profile);for(const f of [missing,normal]){f.tick(0);f.tick(120);f.p.location.x=2.7;f.tick(160)}
  assert.deepEqual(missing.hits,normal.hits);assert.deepEqual(missing.effects,normal.effects);assert.deepEqual(missing.pushes,normal.pushes);
  assert.ok(!missing.particles.some(x=>x.id===id&&x.at.y===80.8));
 });
}
test('other talents do not inherit the wall-penetration guide note',()=>{
 const f=fixture(profiles[0]);
 for(const profile of mobContentList.filter(p=>!profiles.includes(p)&&p.talent!=='burst')){
  const guide=f.ctrl.fieldGuide(f.p,mobContentList.indexOf(profile));assert.ok(!guide.includes('技は予告円内に即時発生し、壁を貫通'),profile.id);
 }
});
test('cosmetic contact rejects unknown palette and invalid positions',()=>{
 let count=0;const d={spawnParticle:()=>count++};
 talentContact(d,{x:NaN,y:1,z:1},{talent:'web',realm:0});talentContact(d,{x:1,y:1,z:1},{talent:'unmapped'});assert.equal(count,0);
 assert.doesNotThrow(()=>talentContact({spawnParticle(){throw Error('unavailable')}},{x:1,y:2,z:3},{talent:'web',realm:0}));
});
