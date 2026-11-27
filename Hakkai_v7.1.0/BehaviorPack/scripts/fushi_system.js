import { talentImpact, talentTell, guardianPulse } from './mob_talent_effects.js';
import { creatureWindup, creatureStrike } from './mob_attack_visuals.js';
import { EntityDamageCause, GameMode, Difficulty } from '@minecraft/server';
import { inEnderWarning } from './realm_ender.js';
import { startChiefMoon, advanceChiefMoon } from './fushi_moon_projectile.js';
import { startChiefCharge, advanceChiefCharge } from './fushi_chief_charge.js';
import { combatPlayerAttacker } from './combat_player_attacker.js';
import { findCombatPlayer } from './combat_find_player.js';

export const CHIEF_ATTACKS=[
 {name:'月光の体当たり',radius:3,damage:18,effect:'slowness',duration:45,amplifier:0},
 {name:'月光の弾',radius:3.5,damage:16.5,effect:'weakness',duration:70,amplifier:0},
 // Drowsiness is still not forced sleep. Both effects require accepted damage.
 {name:'眠りの霧',radius:4,damage:10.5,effect:'slowness',duration:100,amplifier:1,drowsiness:{effect:'blindness',duration:30,amplifier:0}}
];
// Presentation only; existing single-target hit checks remain authoritative.
export function chiefVisualAnimation(attack,phase){
 const style=['impact','moon','mist'][CHIEF_ATTACKS.indexOf(attack)];
 return style?`animation.hakkai.fushi_chief_${style}_${phase}`:`animation.hakkai.creature_${phase}`;
}
export function setupFushiSystem({world,system,report,isEvading=()=>false,tryParry=()=>false}){
 const states=new Map();
 const playable=p=>p?.isValid&&p.typeId==='minecraft:player'&&p.getGameMode()!==GameMode.Creative&&p.getGameMode()!==GameMode.Spectator;
 // Hooks may move or invalidate either combatant. A contact established before
 // such a hook must not turn into a hit at a different position or dimension.
 function allowedContact(e,p,s,dimensionId){
  try{
   const a={...e.location},b={...p.location},flight=s.flight,nextAt=s.nextAt;
   if(![a.x,a.y,a.z,b.x,b.y,b.z].every(Number.isFinite)||isEvading(p)||tryParry(p,e))return false;
   const x=e.location,y=p.location;
   return states.get(e.id)===s&&s.flight===flight&&s.nextAt===nextAt&&e.isValid&&playable(p)&&s.targetId===p.id&&world.getDifficulty()!==Difficulty.Peaceful&&
    e.dimension.id===dimensionId&&p.dimension.id===dimensionId&&
    x.x===a.x&&x.y===a.y&&x.z===a.z&&y.x===b.x&&y.y===b.y&&y.z===b.z;
  }catch{return false;}
 }
 function onHurt({hurtEntity,damageSource}){
  const attacker=combatPlayerAttacker(damageSource);
  if(hurtEntity?.typeId!=='hakkai:fushi_chief'||!hurtEntity.isValid||!playable(attacker)||world.getDifficulty()===Difficulty.Peaceful)return;
  let s=states.get(hurtEntity.id);
  if(!s){s={nextAt:system.currentTick+20,index:0};states.set(hurtEntity.id,s);}
  if(s.targetId&&s.targetId!==attacker.id){
   // Keep the original target while they remain present: alternating hits from
   // multiple players must not cancel every windup or silently switch victims.
   const current=findCombatPlayer(world,s.targetId);
   try{if(playable(current)&&current.dimension.id===hurtEntity.dimension.id&&Math.hypot(current.location.x-hurtEntity.location.x,current.location.z-hurtEntity.location.z)<=24)return;}catch{}
   s.pending=undefined;s.flight=undefined;s.nextAt=system.currentTick+20;
  }
  s.targetId=attacker.id;s.lastSeen=system.currentTick;
 }
 function onDeath({deadEntity}){if(deadEntity?.typeId==='hakkai:fushi_chief')states.delete(deadEntity.id);}
 // Flight follows a fixed physical trajectory toward the initial aim. The
 // target can move out of that path; no target-floor marker is used.
 // One callback per frame, no catch-up after delayed or canceled updates.
 function launchMoon(e,s,aim,attack,t){
  const flight=startChiefMoon({x:e.location.x,y:e.location.y+.8,z:e.location.z},{x:aim.x,y:aim.y+.8,z:aim.z},t);
  if(!flight){s.nextAt=t+120;return;}
  const dimensionId=e.dimension.id,targetId=s.targetId;
  s.flight=flight;
  function finish(now){if(s.flight===flight){s.flight=undefined;s.nextAt=now+40;}}
  function schedule(){
   try{system.runTimeout(step,1);}catch{finish(system.currentTick);}
  }
  function step(){
   const now=system.currentTick;
   try{
    if(states.get(e.id)!==s||s.flight!==flight)return;
    if(!e.isValid||e.dimension.id!==dimensionId||s.targetId!==targetId||world.getDifficulty()===Difficulty.Peaceful){finish(now);return;}
    const p=findCombatPlayer(world,targetId);
    if(!playable(p)||p.dimension.id!==dimensionId||Math.hypot(p.location.x-e.location.x,p.location.z-e.location.z)>24){finish(now);return;}
    const result=advanceChiefMoon(e.dimension,flight,now,e.id,p.id,'hakkai:shot_time');
    if(result.hit&&result.contact&&p.location.x===result.contact.x&&p.location.y===result.contact.y&&p.location.z===result.contact.z&&allowedContact(e,p,s,dimensionId)){
     let hit=false;try{hit=Boolean(p.applyDamage(attack.damage,{cause:EntityDamageCause.entityAttack,damagingEntity:e}));}catch{}
     if(hit)try{p.addEffect(attack.effect,attack.duration,{amplifier:0,showParticles:false});}catch{}
    }
    if(result.done)finish(now);else schedule();
   }catch{finish(now);}
  }
  schedule();
 }
 // The body charge moves along its original aim on checked ground and can
 // damage only the original target on contact.
 function launchCharge(e,s,aim,attack,t){
  const flight=startChiefCharge(e.location,aim,t);
  if(!flight){s.nextAt=t+120;return;}
  const dimensionId=e.dimension.id,targetId=s.targetId;s.flight=flight;
  function finish(now){if(s.flight===flight){s.flight=undefined;s.nextAt=now+40;}}
  function schedule(){try{system.runTimeout(step,1);}catch{finish(system.currentTick);}}
  function step(){
   const now=system.currentTick;
   try{
    if(states.get(e.id)!==s||s.flight!==flight)return;
    if(!e.isValid||e.dimension.id!==dimensionId||s.targetId!==targetId||world.getDifficulty()===Difficulty.Peaceful){finish(now);return;}
    const p=findCombatPlayer(world,targetId);
    if(!playable(p)||p.dimension.id!==dimensionId||Math.hypot(p.location.x-e.location.x,p.location.z-e.location.z)>24){finish(now);return;}
    const result=advanceChiefCharge(e,p,flight,now);
    const same=(a,b)=>a&&b&&a.x===b.x&&a.y===b.y&&a.z===b.z;
    if(result.contact&&same(p.location,result.targetPosition)&&same(e.location,result.sourcePosition)&&allowedContact(e,p,s,dimensionId)){
     let hit=false;try{hit=Boolean(p.applyDamage(attack.damage,{cause:EntityDamageCause.entityAttack,damagingEntity:e}));}catch{}
     if(hit)try{p.addEffect(attack.effect,attack.duration,{amplifier:attack.amplifier,showParticles:false});}catch{}
    }
    if(result.done)finish(now);else schedule();
   }catch{finish(now);}
  }
  schedule();
 }
 function tickChief(e,t){
  const s=states.get(e.id);if(!s||s.lastTick===t)return;s.lastTick=t;
  if(world.getDifficulty()===Difficulty.Peaceful){states.delete(e.id);return;}
  const p=findCombatPlayer(world,s.targetId);
  if(!playable(p)||p.dimension.id!==e.dimension.id||Math.hypot(p.location.x-e.location.x,p.location.z-e.location.z)>24){
   s.pending=undefined;s.flight=undefined;if(t-s.lastSeen>1200)states.delete(e.id);return;
  }
  s.lastSeen=t;
  if(s.flight)return;
  if(s.pending&&t>=s.pending.at){
   const {aim,attack,at,dimensionId}=s.pending;s.pending=undefined;
   if(t>at||!dimensionId||e.dimension.id!==dimensionId){s.nextAt=t+120;return;} // expired or in a different dimension
   creatureStrike(e,chiefVisualAnimation(attack,'strike'));
   if(attack===CHIEF_ATTACKS[1]){launchMoon(e,s,aim,attack,t);return;}
   if(attack===CHIEF_ATTACKS[0]){launchCharge(e,s,aim,attack,t);return;}
   // The mist blooms around the chief, not at the old player position.
   // The effect and hit test share one source-centred snapshot.
   const center={...e.location};if(![center.x,center.y,center.z].every(Number.isFinite)){s.nextAt=t+40;return;}
   talentImpact(e,{talent:'burst',realm:5},{aim:center,radius:attack.radius});
   guardianPulse(e,5,center,attack.radius);
   if(inEnderWarning(p.location,center,attack.radius)&&allowedContact(e,p,s,dimensionId)){
    let hit=false;try{hit=Boolean(p.applyDamage(attack.damage,{cause:EntityDamageCause.entityAttack,damagingEntity:e}));}catch{}
    if(hit){
     try{p.addEffect(attack.effect,attack.duration,{amplifier:attack.amplifier,showParticles:false});}catch{}
     // Do not lock player input or pretend this is an actual sleep state.
     // Isolate each effect so an unsupported effect cannot undo the hit.
     if(attack.drowsiness){
      const d=attack.drowsiness;
      try{p.addEffect(d.effect,d.duration,{amplifier:d.amplifier,showParticles:false});}catch{}
      try{const l=p.location;e.dimension.spawnParticle('hakkai:mob_shadow',{x:l.x,y:l.y+1.1,z:l.z});}catch{}
     }
    }
   }
   s.nextAt=t+40;return;
  }
  if(!s.pending&&t>=s.nextAt){
   const attack=CHIEF_ATTACKS[s.index++%CHIEF_ATTACKS.length],aim={...p.location};
   creatureWindup(e,chiefVisualAnimation(attack,'windup'));
   talentTell(e,{talent:attack===CHIEF_ATTACKS[2]?'burst':'time',realm:attack===CHIEF_ATTACKS[2]?5:7},aim,attack===CHIEF_ATTACKS[2]?'radial':'forward');
   s.pending={attack,aim,at:t+40,dimensionId:e.dimension.id};
  }
 }
 function tick(player,t){
  try{
   const nearby=player.dimension.getEntities({families:['hakkai_fushi'],location:player.location,maxDistance:28,closest:8});
   for(const entity of nearby)try{
    if(entity.typeId==='hakkai:fushi_chief')tickChief(entity,t);
    else if(t%80===0&&Math.hypot(player.location.x-entity.location.x,player.location.z-entity.location.z)<8){
     try{entity.dimension.spawnParticle('hakkai:climate_7',{x:entity.location.x,y:entity.location.y+1,z:entity.location.z});}catch{}
    }
   }catch(err){if(t%200===0)report('FUSHI個体の行動',err);}
  }catch(err){if(t%200===0)report('FUSHIの行動',err);}
  for(const [id,s] of states)if(t-s.lastSeen>2400)states.delete(id);
 }
 function tickChiefs(player,t){
  if(!player?.isValid||!states.size)return;
  try{for(const entity of player.dimension.getEntities({type:'hakkai:fushi_chief',location:player.location,maxDistance:28,closest:8})){
   try{tickChief(entity,t);}catch(err){if(t%200===0)report('FUSHIのチーフ個体の行動',err);}
  }}
  catch(err){if(t%200===0)report('FUSHIのチーフの行動',err);}
 }
 function stagger(entity,t){
  const s=states.get(entity?.id);if(!s)return;
  s.pending=undefined;s.flight=undefined;s.nextAt=Math.max(s.nextAt,t+40);
 }
 return {onHurt,onDeath,tick,tickChiefs,stagger};
}
