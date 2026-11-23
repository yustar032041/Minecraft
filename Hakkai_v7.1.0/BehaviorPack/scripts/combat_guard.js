// Timed paid guard for Hakkai weapons. The before-damage hook only reads this
// state and modifies event.damage; stamina and particles are changed in tick.
import { EntityDamageCause, GameMode } from '@minecraft/server';
const KINDS=new Set(['剣','斧','槍','盾']);
const COST=5, INTERVAL=20, REDUCTION=.30;
export function setupCombatGuard({notice}){
 const guards=new Map();
 const id=(p,g)=>`${p.dimension.id}|${p.selectedSlotIndex}|${g.id}`;
 function tick(p,g,s,t){
  // Exhaustion belongs to the player, not the item: swapping equipment cannot
  // bypass the requirement to release crouch.
  const prior=guards.get(p.id);
  if(!p.isSneaking){guards.delete(p.id);return false;}
  if(prior?.exhausted)return true;
  const holding=p.isValid&&p.isSneaking&&!p.isSwimming&&!s.busy&&!s.menu&&
    p.getGameMode()!==GameMode.Creative&&p.getGameMode()!==GameMode.Spectator&&g&&KINDS.has(g.kind);
  if(!holding){guards.delete(p.id);return false;}
  const identity=id(p,g);let guard=guards.get(p.id);
  if(!guard||guard.identity!==identity){guard={identity,until:0,exhausted:false};guards.set(p.id,guard);}
  if(guard.exhausted)return true; // release crouch before stamina regenerates
  if(t>=guard.until){
   if(s.s<COST){guard.exhausted=true;notice(p,'§eスタミナ不足：しゃがみを解除して回復',40);return true;}
   s.s-=COST;const start=guard.until===0;guard.until=t+INTERVAL;
   if(start){
    try{p.playAnimation('animation.hakkai.guard_enter',{blendOutTime:.1,stopExpression:'query.any_animation_finished'});}catch{}
    try{p.playSound('random.orb',{volume:.18,pitch:.7});}catch{}
    for(let i=0;i<8;i++)try{const a=i*Math.PI/4;p.dimension.spawnParticle('hakkai:wind_trace',{x:p.location.x+Math.cos(a)*.8,y:p.location.y+.5,z:p.location.z+Math.sin(a)*.8});}catch{}
   }
  }
  return true;
 }
 // Shared paid-state check; no text/UI coupling and no world mutation.
 function isActive(p,g,t){
  const guard=guards.get(p.id);
  return !!(guard&&!guard.exhausted&&p.isValid&&p.isSneaking&&!p.isSwimming&&![GameMode.Creative,GameMode.Spectator].includes(p.getGameMode())&&g&&KINDS.has(g.kind)&&guard.identity===id(p,g)&&t<guard.until);
 }
 // No mutations, inventory changes, sounds or messages in the restricted event.
 function blocks(p,g,source,t){
  if(!isActive(p,g,t))return false;
  if(![EntityDamageCause.entityAttack,EntityDamageCause.projectile].includes(source?.cause))return false;
  try{
   const attacker=source.cause===EntityDamageCause.projectile?(source.damagingProjectile??source.damagingEntity):source.damagingEntity;
   if(!attacker?.isValid||attacker.dimension.id!==p.dimension.id)return false;
   const d=attacker.location,l=p.location,v=p.getViewDirection();
   const dx=d.x-l.x,dz=d.z-l.z,len=Math.hypot(dx,dz),view=Math.hypot(v.x,v.z);
   return len<.1||view>.01&&(dx*v.x+dz*v.z)/(len*view)>.1;
  }catch{return false;}
 }
 function scale(p,g,source,t,damage){return blocks(p,g,source,t)?damage*REDUCTION:damage;}
 function status(p,g,t){
  const guard=guards.get(p.id);if(!guard||!p.isSneaking||!g||guard.identity!==id(p,g))return '';
  if(guard.exhausted)return '§e防御疲れ：しゃがみ解除';
  return t<guard.until?'§b防御中':'';
 }
 function invalidate(playerId){const guard=guards.get(playerId);if(guard&&!guard.exhausted)guards.delete(playerId);}
 function clear(playerId){guards.delete(playerId);}
 return {tick,isActive,blocks,scale,status,invalidate,clear};
}
