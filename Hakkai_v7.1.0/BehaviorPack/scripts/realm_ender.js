import { talentTell } from './mob_talent_effects.js';
import { creatureWindup, creatureStrike } from './mob_attack_visuals.js';
import { EntityDamageCause, GameMode, Difficulty, EquipmentSlot } from '@minecraft/server';
import { validRealmEnderRetreat } from './realm_ender_retreat.js';
import { combatPlayerAttacker } from './combat_player_attacker.js';
import { findCombatPlayer } from './combat_find_player.js';
import { startMobProjectile, advanceMobProjectile } from './mob_projectile.js';

export const ENDER_ABILITIES=[
 {label:'風薙ぎ',effect:'weakness',ticks:50,damage:4,radius:3},
 {label:'霧の刃',effect:'blindness',ticks:35,damage:4.5,radius:3},
 {label:'砂縛り',effect:'slowness',ticks:60,damage:5,radius:3},
 {label:'氷の環',effect:'slowness',ticks:70,damage:5.5,radius:3.5},
 {label:'雷の十字',effect:'weakness',ticks:60,damage:6,radius:3},
 {label:'闇のくさび',effect:'darkness',ticks:40,damage:6.5,radius:3},
 {label:'空の裂け目',effect:'slow_falling',ticks:55,damage:7,radius:3.5},
 {label:'時の封印',effect:'mining_fatigue',ticks:60,damage:7.5,radius:3}
];
// One pattern per realm: approach angle, orbit step per attack, preferred
// distance and recovery. Angles are relative to the target's view direction,
// or the traveler's current side when that direction is unavailable.
export const ENDER_WARPS=Object.freeze([
 {angle:Math.PI/2,step:Math.PI,radius:3.5,recovery:80},     // wind: alternate flanks, quick
 {angle:Math.PI,step:0,radius:4.5,recovery:120},            // mist: behind
 {angle:0,step:Math.PI/2,radius:4,recovery:120},            // sand: circle in quarters
 {angle:Math.PI/4,step:Math.PI,radius:5,recovery:160},     // ice: diagonal, distant
 {angle:-Math.PI/2,step:Math.PI,radius:3,recovery:80},     // thunder: rapid opposite flanks
 {angle:Math.PI,step:Math.PI/2,radius:3.5,recovery:120},   // shadow: rear, then orbit
 {angle:Math.PI/4,step:-Math.PI/2,radius:5,recovery:120},  // sky: wide reverse orbit
 {angle:0,step:Math.PI,radius:4.5,recovery:160}            // time: front / back, slow
]);
export function enderRealm(id){const match=/^hakkai:ender_([0-7])$/.exec(id??'');return match?Number(match[1]):-1;}
export function inEnderWarning(player,aim,radius){
 return Math.hypot(player.x-aim.x,player.z-aim.z)<=radius&&Math.abs(player.y-aim.y)<=3;
}
export function setupRealmEnders({world,system,report,safe=()=>false,isEvading=()=>false,tryParry=()=>false}){
 const states=new Map();
 const playable=p=>p?.isValid&&p.typeId==='minecraft:player'&&p.getGameMode()!==GameMode.Creative&&p.getGameMode()!==GameMode.Spectator;
 function onHurt({hurtEntity,damageSource}){
  const realm=enderRealm(hurtEntity?.typeId),player=combatPlayerAttacker(damageSource);
  if(realm<0||!playable(player)||!hurtEntity.isValid||world.getDifficulty()===Difficulty.Peaceful)return;
  let state=states.get(hurtEntity.id);
  if(!state){state={nextAt:system.currentTick+20};states.set(hurtEntity.id,state);}
  if(damageSource?.cause===EntityDamageCause.projectile)state.retreat=true;
  if(state.targetId&&state.targetId!==player.id){
   // Keep the same warned target while available, even if others hit it.
   const current=findCombatPlayer(world,state.targetId);
   try{if(playable(current)&&current.dimension.id===hurtEntity.dimension.id&&Math.hypot(current.location.x-hurtEntity.location.x,current.location.z-hurtEntity.location.z)<=28)return;}catch{}
   state.pending=undefined;state.flight=undefined;state.nextAt=system.currentTick+20;
  }
  state.targetId=player.id;state.lastSeen=system.currentTick;
 }
 // Only a direct, unobstructed look toward the head can initiate a fight.
 // Missing ray APIs, head position or helmet access fail closed.
 function lookAt(player,entity,t){
  try{
   if(!playable(player)||world.getDifficulty()===Difficulty.Peaceful||states.has(entity.id))return;
   if(player.dimension.id!==entity.dimension.id)return;
   const equip=player.getComponent('minecraft:equippable');if(!equip)return;
   if(equip.getEquipment(EquipmentSlot.Head)?.typeId==='minecraft:carved_pumpkin')return;
   const eye=player.getHeadLocation(),head=entity.getHeadLocation(),view=player.getViewDirection();
   const dx=head.x-eye.x,dy=head.y-eye.y,dz=head.z-eye.z,len=Math.hypot(dx,dy,dz),vlen=Math.hypot(view.x,view.y,view.z);
   if(len<1||len>16||vlen<.01||(dx*view.x+dy*view.y+dz*view.z)/(len*vlen)<.995)return;
   const seen=player.getEntitiesFromViewDirection({maxDistance:16,ignoreBlockCollision:false,includeLiquidBlocks:true});
   // A non-target in front of the traveler blocks a gaze, just as a wall
   // does. Unknown ray results fail closed; never silently look through one.
   if(!Array.isArray(seen)||seen.some(hit=>!hit?.entity||!Number.isFinite(hit.distance)||hit.distance<0))return;
   const hits=seen.filter(hit=>hit.entity.isValid&&hit.distance<=16).sort((a,b)=>a.distance-b.distance);
   if(!hits.length||hits[0].entity.id!==entity.id||hits.some(hit=>hit.entity.id!==entity.id&&hit.distance<=hits[0].distance))return;
   // This is an optional gaze notification, not an attack warning.
   try{player.sendMessage('§d界渡りが視線に気づいた！');}catch{}
   states.set(entity.id,{targetId:player.id,lastSeen:t,nextAt:t+40});
  }catch{}
 }
 // Search a small loaded area; don't modify blocks, load chunks or teleport
 // into a player. A three-block-high space is required for the 2.75-high mob.
 function retreat(entity,t){
  const d=entity.dimension,base={...entity.location};
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4+(t%20)/20,r=4+(i%2)*2;
   for(const dy of [0,-1,1,-2,2]){
    const at={x:Math.floor(base.x+Math.cos(a)*r)+.5,y:Math.floor(base.y)+dy,z:Math.floor(base.z+Math.sin(a)*r)+.5};
    try{
     if(!d.isChunkLoaded(at)||!safe(d,at)||!validRealmEnderRetreat(d,at))continue;
     if(d.getPlayers({location:at,maxDistance:4,closest:1}).length)continue;
     if(d.getEntities({location:at,maxDistance:1.5,closest:8}).some(other=>other.id!==entity.id))continue;
     entity.teleport(at,{checkForBlocks:true});
     try{d.spawnParticle('minecraft:basic_portal_particle',base);d.spawnParticle('minecraft:basic_portal_particle',at);}catch{}
     return true;
    }catch{}
   }
  }
  return false;
 }
 // Reposition toward the target before a warning, never during one. Failed
 // landings leave the creature in place; no chunk loading or block changes.
 function approach(entity,target,realm,sequence){
  const d=entity.dimension,base={...entity.location},center={...target.location},pattern=ENDER_WARPS[realm];
  let direction;
  try{direction=target.getViewDirection();}catch{}
  let dx=direction?.x,dz=direction?.z;
  if(!Number.isFinite(dx)||!Number.isFinite(dz)||Math.hypot(dx,dz)<.01){dx=base.x-center.x;dz=base.z-center.z;}
  if(!Number.isFinite(dx)||!Number.isFinite(dz))return false;
  const start=Math.atan2(dz,dx)+pattern.angle+pattern.step*sequence;
  for(let i=0;i<8;i++){
   const a=start+i*Math.PI/4;
   for(const dy of [0,1,-1,2,-2]){
    const at={x:Math.floor(center.x+Math.cos(a)*pattern.radius)+.5,y:Math.floor(center.y)+dy,z:Math.floor(center.z+Math.sin(a)*pattern.radius)+.5};
    try{
     if(Math.hypot(at.x-center.x,at.z-center.z)<2.5)continue;
     if(!d.isChunkLoaded(at)||!safe(d,at)||!validRealmEnderRetreat(d,at))continue;
     if(d.getPlayers({location:at,maxDistance:2.25,closest:1}).length)continue;
     if(d.getEntities({location:at,maxDistance:1.5,closest:8}).some(other=>other.id!==entity.id))continue;
     entity.teleport(at,{checkForBlocks:true});
     try{d.spawnParticle('minecraft:basic_portal_particle',base);d.spawnParticle('minecraft:basic_portal_particle',at);}catch{}
     return true;
    }catch{}
   }
  }
  return false;
 }
 function onDeath({deadEntity}){if(enderRealm(deadEntity?.typeId)>=0)states.delete(deadEntity.id);}
 // Each realm has a fixed path toward the captured aim; the shot stops at
 // the first wall or entity. The original target may dodge or be shielded.
 function launch(entity,state,realm,aim,dimensionId,t){
  const ability=ENDER_ABILITIES[realm],flight=startMobProjectile(entity.location,aim,t,12,{talent:'traveler',realm});
  if(!flight)return;
  const targetId=state.targetId;state.flight=flight;
  function finish(){if(state.flight===flight)state.flight=undefined;}
  function schedule(){try{system.runTimeout(step,1);}catch{finish();}}
  function step(){
   try{
    if(states.get(entity.id)!==state||state.flight!==flight)return;
    const p=findCombatPlayer(world,targetId);
    if(!entity.isValid||entity.dimension.id!==dimensionId||state.targetId!==targetId||!playable(p)||p.dimension.id!==dimensionId||world.getDifficulty()===Difficulty.Peaceful){finish();return;}
    const source={...entity.location};
    const result=advanceMobProjectile(entity.dimension,flight,system.currentTick,entity.id,targetId,{talent:'traveler',realm});
    const same=(a,b)=>a&&b&&a.x===b.x&&a.y===b.y&&a.z===b.z;
    if(result.hit&&same(p.location,result.contact)&&same(entity.location,source)&&!isEvading(p)&&!tryParry(p,entity)&&
      states.get(entity.id)===state&&state.flight===flight&&state.targetId===targetId&&entity.isValid&&playable(p)&&
      entity.dimension.id===dimensionId&&p.dimension.id===dimensionId&&world.getDifficulty()!==Difficulty.Peaceful&&
      same(p.location,result.contact)&&same(entity.location,source)){
     let hit=false;try{hit=Boolean(p.applyDamage(ability.damage,{cause:EntityDamageCause.entityAttack,damagingEntity:entity}));}catch{}
     if(hit)try{p.addEffect(ability.effect,ability.ticks,{amplifier:0,showParticles:false});}catch{}
    }
    if(result.done)finish();else schedule();
   }catch{finish();}
  }
  schedule();
 }
 function tickFor(entity,t){
  const realm=enderRealm(entity.typeId),state=states.get(entity.id);if(realm<0||!state||state.lastTick===t)return;
  state.lastTick=t;
  if(world.getDifficulty()===Difficulty.Peaceful){states.delete(entity.id);return;}
  const target=findCombatPlayer(world,state.targetId);
  if(!playable(target)||target.dimension.id!==entity.dimension.id||Math.hypot(target.location.x-entity.location.x,target.location.z-entity.location.z)>28){
   state.pending=undefined;state.flight=undefined;if(t-state.lastSeen>1200)states.delete(entity.id);return;
  }
  state.lastSeen=t;
  if(state.flight)return;
  if(state.retreat&&!state.pending){state.retreat=false;retreat(entity,t);return;}
  if(state.pending&&t>=state.pending.at){
   const {aim,at,dimensionId}=state.pending;state.pending=undefined;
   if(t>at||!dimensionId||entity.dimension.id!==dimensionId){state.nextAt=t+120;return;}
   creatureStrike(entity);
   state.nextAt=t+ENDER_WARPS[realm].recovery;
   launch(entity,state,realm,aim,dimensionId,t);return;
  }
  if(!state.pending&&t>=state.nextAt){
   const warped=approach(entity,target,realm,state.sequence??0);
   // A failed warp may still strike nearby, but cannot become a long-range
   // invisible attack. Try again later if terrain prevents approach.
   if(!warped&&(Math.hypot(target.location.x-entity.location.x,target.location.z-entity.location.z)>8||Math.abs(target.location.y-entity.location.y)>3)){
    state.nextAt=t+40;return;
   }
   state.sequence=(state.sequence??0)+1;
   const aim={...target.location};
   if(![aim.x,aim.y,aim.z].every(Number.isFinite)){state.nextAt=t+120;return;}
   creatureWindup(entity);talentTell(entity,{talent:'burst',realm},aim);
   state.pending={at:t+40,aim,dimensionId:entity.dimension.id};
  }
 }
 function tick(player,t){
  try{
   for(const e of player.dimension.getEntities({families:['hakkai_realm_ender'],location:player.location,maxDistance:32,closest:8}))try{
    if(!states.has(e.id))lookAt(player,e,t);
    tickFor(e,t);
   }catch(err){if(t%200===0)report('界渡り個体の反撃',err);}
  }catch(err){if(t%200===0)report('界渡りの反撃',err);}
  for(const [id,s] of states)if(t-s.lastSeen>2400)states.delete(id);
 }
 function stagger(entity,t){
  const s=states.get(entity?.id);if(!s)return;
  s.pending=undefined;s.flight=undefined;s.nextAt=Math.max(s.nextAt,t+40);
 }
 return {tick,onHurt,onDeath,stagger};
}
