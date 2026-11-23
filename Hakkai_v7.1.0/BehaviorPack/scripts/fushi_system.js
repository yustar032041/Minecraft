import { EntityDamageCause, GameMode, Difficulty } from '@minecraft/server';
import { inEnderWarning } from './realm_ender.js';

export const CHIEF_ATTACKS=[
 {name:'月光の体当たり',radius:3,damage:7,effect:'slowness',duration:45},
 {name:'月光の弾',radius:3.5,damage:6,effect:'weakness',duration:70},
 {name:'眠りの霧',radius:4,damage:3,effect:'slowness',duration:100}
];
export function setupFushiSystem({world,system,report,isEvading=()=>false,tryParry=()=>false}){
 const states=new Map();
 const playable=p=>p?.isValid&&p.typeId==='minecraft:player'&&p.getGameMode()!==GameMode.Creative&&p.getGameMode()!==GameMode.Spectator;
 function onHurt({hurtEntity,damageSource}){
  if(hurtEntity?.typeId!=='hakkai:fushi_chief'||!hurtEntity.isValid||!playable(damageSource?.damagingEntity)||world.getDifficulty()===Difficulty.Peaceful)return;
  let s=states.get(hurtEntity.id);
  if(!s){s={nextAt:system.currentTick+20,index:0};states.set(hurtEntity.id,s);}
  if(s.targetId&&s.targetId!==damageSource.damagingEntity.id){s.pending=undefined;s.nextAt=system.currentTick+20;}
  s.targetId=damageSource.damagingEntity.id;s.lastSeen=system.currentTick;
 }
 function onDeath({deadEntity}){if(deadEntity?.typeId==='hakkai:fushi_chief')states.delete(deadEntity.id);}
 function ring(d,at,radius){
  let ok=true;for(let i=0;i<16;i++){
   const a=i*Math.PI/8;
   try{d.spawnParticle('hakkai:warning_marker',{x:at.x+radius*Math.cos(a),y:at.y+.15,z:at.z+radius*Math.sin(a)});}catch{ok=false;}
  }
  return ok;
 }
 function tickChief(e,t){
  const s=states.get(e.id);if(!s||s.lastTick===t)return;s.lastTick=t;
  if(world.getDifficulty()===Difficulty.Peaceful){states.delete(e.id);return;}
  const p=world.getAllPlayers().find(player=>player.id===s.targetId);
  if(!playable(p)||p.dimension.id!==e.dimension.id||Math.hypot(p.location.x-e.location.x,p.location.z-e.location.z)>24){
   s.pending=undefined;if(t-s.lastSeen>1200)states.delete(e.id);return;
  }
  s.lastSeen=t;
  if(s.pending&&t>=s.pending.at){
   const {aim,attack,at}=s.pending;s.pending=undefined;
   if(t>at){s.nextAt=t+120;return;} // Never strike after the marker expired.
   if(inEnderWarning(p.location,aim,attack.radius)&&!isEvading(p)&&!tryParry(p,e)){
    let hit=false;try{hit=Boolean(p.applyDamage(attack.damage,{cause:EntityDamageCause.entityAttack,damagingEntity:e}));}catch{}
    if(hit)try{p.addEffect(attack.effect,attack.duration,{amplifier:attack.name==='眠りの霧'?1:0,showParticles:false});}catch{}
   }
   s.nextAt=t+120;return;
  }
  if(!s.pending&&t>=s.nextAt){
   const attack=CHIEF_ATTACKS[s.index++%CHIEF_ATTACKS.length],aim={...p.location};
   try{p.sendMessage(`§dFUSHIのチーフ：${attack.name}（約2秒後）`);}
   catch{s.nextAt=t+120;return;}
   if(!ring(e.dimension,aim,attack.radius)){s.nextAt=t+120;return;}
   s.pending={attack,aim,at:t+40};
  }
 }
 function tick(player,t){
  try{
   const nearby=player.dimension.getEntities({families:['hakkai_fushi'],location:player.location,maxDistance:28,closest:8});
   for(const entity of nearby){
    if(entity.typeId==='hakkai:fushi_chief')tickChief(entity,t);
    else if(t%80===0&&Math.hypot(player.location.x-entity.location.x,player.location.z-entity.location.z)<8){
     try{entity.dimension.spawnParticle('hakkai:climate_7',{x:entity.location.x,y:entity.location.y+1,z:entity.location.z});}catch{}
    }
   }
  }catch(err){if(t%200===0)report('FUSHIの行動',err);}
  for(const [id,s] of states)if(t-s.lastSeen>2400)states.delete(id);
 }
 function stagger(entity,t){
  const s=states.get(entity?.id);if(!s)return;
  s.pending=undefined;s.nextAt=Math.max(s.nextAt,t+40);
 }
 return {onHurt,onDeath,tick,stagger};
}
