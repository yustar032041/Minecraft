import { talentImpact } from './mob_talent_effects.js';
import { creatureWindup, creatureStrike } from './mob_attack_visuals.js';
import { EntityDamageCause, GameMode, Difficulty, EquipmentSlot } from '@minecraft/server';
import { validRealmEnderRetreat } from './realm_ender_retreat.js';
import { combatPlayerAttacker } from './combat_player_attacker.js';
import { findCombatPlayer } from './combat_find_player.js';

export const ENDER_ABILITIES=[
 {label:'風の環',effect:'weakness',ticks:50,damage:4,radius:3},
 {label:'霧の環',effect:'blindness',ticks:35,damage:4,radius:3},
 {label:'砂の環',effect:'slowness',ticks:60,damage:5,radius:3},
 {label:'氷の環',effect:'slowness',ticks:70,damage:4,radius:3.5},
 {label:'雷の環',effect:'weakness',ticks:60,damage:6,radius:3},
 {label:'闇の環',effect:'darkness',ticks:40,damage:5,radius:3},
 {label:'空の環',effect:'slow_falling',ticks:55,damage:5,radius:3.5},
 {label:'時の環',effect:'mining_fatigue',ticks:60,damage:5,radius:3}
];
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
   state.pending=undefined;state.nextAt=system.currentTick+20;
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
   // A message failure leaves the creature neutral rather than attacking silently.
   player.sendMessage('§d界渡りが視線に気づいた！');
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
 function onDeath({deadEntity}){if(enderRealm(deadEntity?.typeId)>=0)states.delete(deadEntity.id);}
 function ring(d,at,realm,radius){
  let ok=true;for(let i=0;i<16;i++){
   const a=i*Math.PI/8;
   try{d.spawnParticle('hakkai:warning_marker',{x:at.x+Math.cos(a)*radius,y:at.y+.15,z:at.z+Math.sin(a)*radius});}catch{ok=false;}
  }
  return ok;
 }
 function tickFor(entity,t){
  const realm=enderRealm(entity.typeId),state=states.get(entity.id);if(realm<0||!state||state.lastTick===t)return;
  state.lastTick=t;
  if(world.getDifficulty()===Difficulty.Peaceful){states.delete(entity.id);return;}
  const target=findCombatPlayer(world,state.targetId);
  if(!playable(target)||target.dimension.id!==entity.dimension.id||Math.hypot(target.location.x-entity.location.x,target.location.z-entity.location.z)>28){
   state.pending=undefined;if(t-state.lastSeen>1200)states.delete(entity.id);return;
  }
  state.lastSeen=t;
  if(state.retreat&&!state.pending){state.retreat=false;retreat(entity,t);}
  const ability=ENDER_ABILITIES[realm];
  if(state.pending&&t>=state.pending.at){
   const {aim:mark,at,dimensionId}=state.pending;state.pending=undefined;
   if(t>at||!dimensionId||entity.dimension.id!==dimensionId){state.nextAt=t+120;return;} // expired or in a different dimension
   creatureStrike(entity);
   talentImpact(entity,{talent:'burst',realm},{aim:mark,radius:ability.radius});
   if(inEnderWarning(target.location,mark,ability.radius)&&!isEvading(target)&&!tryParry(target,entity)){
    let hit=false;try{hit=Boolean(target.applyDamage(ability.damage,{cause:EntityDamageCause.entityAttack,damagingEntity:entity}));}catch{}
    if(hit)try{target.addEffect(ability.effect,ability.ticks,{amplifier:0,showParticles:false});}catch{}
   }
   state.nextAt=t+120;return;
  }
  if(!state.pending&&t>=state.nextAt){
   const aim={...target.location};
   try{target.sendMessage(`§d${ability.label}：光の輪から離れよう（上下3ブロック・約2秒、あなたのみ対象）`);}
   catch{state.nextAt=t+120;return;}
   if(!ring(entity.dimension,aim,realm,ability.radius)){state.nextAt=t+120;return;}
   creatureWindup(entity);state.pending={at:t+40,aim,dimensionId:entity.dimension.id};
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
  s.pending=undefined;s.nextAt=Math.max(s.nextAt,t+40);
 }
 return {tick,onHurt,onDeath,stagger};
}
