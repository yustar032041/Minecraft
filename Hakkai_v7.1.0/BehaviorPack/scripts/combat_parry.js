import {EntityDamageCause,GameMode} from '@minecraft/server';
import {isCombatTarget} from './combat_resonance.js';
// Only plain JS state changes in tryHit: called from a restricted before event.
// World effects and boss callbacks are deferred until the normal tick loop.
const WINDOW=6,COST=15,STAGGER=40,NEAR=5;
export function setupCombatParry({guard,onSuccess}){
 const entries=new Map(),staggered=new Map(),queue=[];
 const identity=(p,g)=>`${p.dimension.id}|${p.selectedSlotIndex}|${g.id}`;
 function tick(p,g,s,t){
  if(!p.isValid||p.typeId!=='minecraft:player'||p.getGameMode()!==GameMode.Survival||p.isSwimming||s.busy||s.menu||!g){entries.delete(p.id);return;}
  const key=identity(p,g);let entry=entries.get(p.id);
  if(!entry||entry.key!==key){entry={key,held:false,paid:false,until:0};entries.set(p.id,entry);}
  if(p.isSneaking){entry.held=true;entry.paid=guard.isActive(p,g,t);entry.until=0;}
  else if(entry.held){entry.until=entry.paid?t+WINDOW:0;entry.held=false;entry.paid=false;}
 }
 function inFront(p,source){
  const origin=source.cause===EntityDamageCause.projectile?(source.damagingProjectile??source.damagingEntity):source.damagingEntity;
  if(!origin?.isValid||origin.dimension.id!==p.dimension.id)return false;
  const a=origin.location,b=p.location,v=p.getViewDirection(),dx=a.x-b.x,dz=a.z-b.z,n=Math.hypot(dx,dz),vn=Math.hypot(v.x,v.z);
  return n<.1||vn>.01&&(dx*v.x+dz*v.z)/(n*vn)>.1;
 }
 function tryHit(p,g,s,source,t){
  const entry=entries.get(p?.id);
  if(!entry||!s||!g||!p.isValid||p.typeId!=='minecraft:player'||p.isSneaking||p.isSwimming||s.busy||s.menu||p.getGameMode()!==GameMode.Survival||entry.key!==identity(p,g)||t>=entry.until||s.s<COST)return false;
  if(![EntityDamageCause.entityAttack,EntityDamageCause.projectile].includes(source?.cause))return false;
  const attacker=source.damagingEntity;
  try{
   if(!attacker?.isValid||attacker.dimension.id!==p.dimension.id||!isCombatTarget(attacker)||!inFront(p,source))return false;
   const near=Math.hypot(attacker.location.x-p.location.x,attacker.location.z-p.location.z)<=NEAR&&Math.abs(attacker.location.y-p.location.y)<=3;
   entry.until=0;s.s-=COST;
   if(near)staggered.set(attacker.id,{dimension:attacker.dimension.id,start:t+1,until:t+1+STAGGER});
   queue.push({p,attacker,near,at:t,dimension:p.dimension.id});
   return true;
  }catch{return false;}
 }
 // Also used by light and moon magic for ordinary enemies. Starts next tick
 // so a before-hurt callback never mutates world state during the same hit.
 function staggerTarget(entity,t,duration){
  if(!entity?.isValid||!Number.isFinite(t)||!Number.isFinite(duration)||duration<=0)return false;
  if(!staggered.has(entity.id)&&staggered.size>=512)return false;
  const previous=staggered.get(entity.id),until=t+1+Math.min(100,duration);
  staggered.set(entity.id,{dimension:entity.dimension.id,start:t+1,until:Math.max(previous?.until??0,until)});return true;
 }
 function isStaggered(entity,t){
  const e=staggered.get(entity?.id);
  return !!(e&&entity.isValid&&entity.dimension.id===e.dimension&&t>=e.start&&t<e.until);
 }
 function flush(t){
  for(const q of queue.splice(0))try{if(q.p.isValid&&q.attacker.isValid&&q.p.dimension.id===q.dimension&&q.attacker.dimension.id===q.dimension)onSuccess(q);}catch{}
  for(const [id,e] of staggered)if(t>=e.until)staggered.delete(id);
 }
 function status(p,t){const e=entries.get(p.id);return e&&t<e.until?'§eパリィ受付中':'';}
 function clear(id){entries.delete(id);}
 function clearAttacker(id){staggered.delete(id);}
 return {tick,tryHit,staggerTarget,isStaggered,flush,status,clear,clearAttacker};
}
