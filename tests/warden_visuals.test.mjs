import assert from 'node:assert/strict';
import {wardenTransition,wardenCharge,wardenImpact,wardenParried} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_visuals.js';
import {WARDEN_PHASES,WARDEN_ALTERNATES,WARDEN_EXTRA,WARDEN_DAMAGE_MULTIPLIER,inWardenWarning,setupWardenBoss} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_boss.js';
import {Difficulty,GameMode} from '@minecraft/server';
const ids=['time','sky','earth','thunder','moon'].map(n=>`hakkai:warden_${n}`);
const anims=['slash','sky_cast','slam','thunder_cast','moon_cast'].map(n=>`animation.hakkai.warden_${n}`);
const aim={x:0,y:80,z:0};
for(let phase=0;phase<5;phase++){
 for(const attack of [WARDEN_PHASES[phase],WARDEN_ALTERNATES[phase],...WARDEN_EXTRA[phase]]){
  const dots=[],motions=[];const e={location:{x:0,y:80,z:0},dimension:{spawnParticle:(id,p)=>dots.push([id,p])},playAnimation:id=>motions.push(id)};
  wardenImpact(e,aim,attack,phase,inWardenWarning);
  assert.equal(motions[0],anims[phase]);assert.ok(dots.length>0&&dots.length<=72,`${attack.attack}: budget`);
  for(const [id,p] of dots){assert.equal(id,ids[phase]);assert.ok(inWardenWarning({...p,y:aim.y},aim,attack),`${attack.attack}: effects must stay inside marked XZ footprint`);}
 }
 const dots=[],motions=[],e={location:aim,dimension:{spawnParticle:(id,p)=>dots.push([id,p])},playAnimation:id=>motions.push(id)};
 wardenTransition(e,phase);assert.equal(dots.length,36);assert.equal(motions[0],'animation.hakkai.warden_transform');
 dots.length=0;wardenCharge(e,phase,0);wardenCharge(e,phase,1);wardenCharge(e,phase,2);
 assert.equal(dots.length,36);assert.equal(motions.filter(n=>n.endsWith('warning')).length,1);assert.ok(dots.every(([,p])=>p.y>=83),'charge effect does not cover the floor marker');
 dots.length=0;wardenParried(e,phase);assert.equal(dots.length,12);assert.equal(motions.at(-1),'animation.hakkai.warden_recoil');
}
// Optional particles or animation failures do not escape or disable damage.
{
 const errors={location:aim,dimension:{spawnParticle:()=>{throw Error('particle');}},playAnimation:()=>{throw Error('animation');}};
 for(const fn of [()=>wardenTransition(errors,0),()=>wardenCharge(errors,0),()=>wardenImpact(errors,aim,WARDEN_PHASES[0],0,inWardenWarning),()=>wardenParried(errors,0)])assert.doesNotThrow(fn);
}
function fixture(){
 const particles=[],animations=[],hits=[],sounds=[];const health={currentValue:5000,effectiveMax:5000,setCurrentValue(v){this.currentValue=v;}};
 const d={id:'hakkai:warden_arena',getPlayers:()=>[p],getEntities:()=>[e],spawnParticle:(id,loc)=>{particles.push([id,loc]);if(d.fail===id)throw Error('no effect');}};
 const p={id:'p',typeId:'minecraft:player',isValid:true,isSneaking:true,location:{x:0,y:80,z:0},dimension:d,getGameMode:()=>GameMode.Survival,sendMessage:()=>{},playSound:id=>sounds.push(id),applyDamage:n=>hits.push(n),addEffect:()=>{}};
 const e={id:'e',typeId:'hakkai:time_warden',isValid:true,location:{x:0,y:80,z:2},dimension:d,getDynamicProperty:()=>undefined,setDynamicProperty:()=>{},getComponent:()=>health,playAnimation:id=>animations.push(id)};
 const sys={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[p]};const ctrl=setupWardenBoss({world,system:sys,property:()=>{},report:()=>assert.fail('unexpected error'),spendParry:()=>true});
 const tick=t=>{sys.currentTick=t;ctrl.tick(p,t);};return {p,e,d,health,particles,animations,hits,sounds,sys,ctrl,tick};
}
{
 const f=fixture();f.tick(0);f.tick(80);assert.equal(f.particles.filter(([id])=>id==='hakkai:warning_marker').length,20);assert.ok(f.animations.includes('animation.hakkai.warden_warning'));
 f.tick(100);f.tick(110);f.tick(120);assert.deepEqual(f.hits,[9*WARDEN_DAMAGE_MULTIPLIER]);assert.ok(f.animations.includes(anims[0]));assert.ok(f.sounds.includes('random.explode'));
 f.health.currentValue=3990;f.tick(121);assert.ok(f.animations.includes('animation.hakkai.warden_transform'));
}
{
 const f=fixture();for(const t of [0,80,120,220,260,360])f.tick(t);
 const strikes=()=>f.animations.filter(a=>a===anims[0]).length,initial=strikes();
 for(const [t,n] of [[400,1],[420,2],[440,3]]){f.tick(t);assert.equal(strikes(),initial+n,'one impact animation per warned combo hit');}
 assert.deepEqual(f.hits.slice(-3),[6*WARDEN_DAMAGE_MULTIPLIER,6*WARDEN_DAMAGE_MULTIPLIER,6*WARDEN_DAMAGE_MULTIPLIER]);
}
{
 const f=fixture();f.d.fail='hakkai:warden_time';f.tick(0);f.tick(80);f.tick(100);f.tick(110);f.tick(120);assert.deepEqual(f.hits,[9*WARDEN_DAMAGE_MULTIPLIER],'cosmetic failure does not block combat');
}
{
 const f=fixture();f.d.fail='hakkai:warning_marker';f.tick(0);f.tick(80);f.tick(120);assert.deepEqual(f.hits,[]);assert.ok(!f.animations.includes(anims[0]),'no strike FX without warning');
}
{
 const f=fixture();f.tick(0);f.tick(80);f.sys.currentTick=112;assert.equal(f.ctrl.onMeleeParry({damagingEntity:f.p,hitEntity:f.e}),true);assert.ok(f.animations.includes('animation.hakkai.warden_recoil'));f.tick(120);assert.deepEqual(f.hits,[]);assert.ok(!f.animations.includes(anims[0]),'parried attack has no impact');
}
{
 const f=fixture();f.tick(0);f.tick(80);f.tick(121);assert.deepEqual(f.hits,[]);assert.ok(!f.animations.includes(anims[0]),'stale attacks have no impact');
}
console.log('Warden visuals: 25 shape-safe effects, bounded budget, phases, parry, cancellation and optional API failures (mocked)');
