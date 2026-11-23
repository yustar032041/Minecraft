// Script approximation, not the engine's native shield implementation.
// The before-hurt callback only reads state and sets cancel; no inventory or
// world mutations occur there. Unknown sources and stale state fail open.
import {EntityDamageCause,EquipmentSlot,GameMode} from '@minecraft/server';
export function setupCustomShield({catalog,prepare=()=>true}){
 const ids=new Set(catalog.filter(g=>g.kind==='盾').map(g=>'hakkai:'+g.id));
 const raised=new Map(),disabled=new Map();
 const axes=new Set([...catalog.filter(g=>g.kind==='斧').map(g=>'hakkai:'+g.id),'hakkai:ult_axe']);
 function equipped(p){
  try{
   const eq=p.getComponent('minecraft:equippable');
   for(const slot of [EquipmentSlot.Offhand,EquipmentSlot.Mainhand]){
    const item=eq?.getEquipment(slot);
    if(item&&ids.has(item.typeId))return {slot,typeId:item.typeId,key:`${p.dimension.id}|${slot}|${slot===EquipmentSlot.Mainhand?p.selectedSlotIndex:''}|${item.typeId}`};
   }
  }catch{}
 }
 function tick(p,t){
  if(!p?.isValid||p.typeId!=='minecraft:player'||!p.isSneaking||p.isSwimming||p.getGameMode()===GameMode.Spectator){raised.delete(p?.id);return;}
  const item=equipped(p);if(!item||!prepare(p,item)){raised.delete(p.id);return;}
  const old=raised.get(p.id);if(!old||old.key!==item.key)raised.set(p.id,{key:item.key,readyAt:t+5});
 }
 function blocks(p,source,t){
  try{
   if(!p?.isValid||p.typeId!=='minecraft:player'||!p.isSneaking||p.isSwimming||p.getGameMode()===GameMode.Spectator)return false;
   const state=raised.get(p.id),item=equipped(p);
   if(!state||!item||item.key!==state.key||t<state.readyAt||t<(disabled.get(p.id)??0))return false;
   if(![EntityDamageCause.entityAttack,EntityDamageCause.projectile].includes(source?.cause))return false;
   const attacker=source.cause===EntityDamageCause.projectile?(source.damagingProjectile??source.damagingEntity):source.damagingEntity;
   if(!attacker?.isValid||attacker.dimension.id!==p.dimension.id)return false;
   const d=attacker.location,l=p.location,v=p.getViewDirection(),dx=d.x-l.x,dz=d.z-l.z,n=Math.hypot(dx,dz),vn=Math.hypot(v.x,v.z);
   return n<.1||vn>.01&&(dx*v.x+dz*v.z)/(n*vn)>.1;
  }catch{return false;}
 }
 // Only called after a confirmed frontal shield block. Keep the cooldown on
 // the player so swapping shields or releasing sneak cannot bypass it.
 function recordBlock(p,source,t){
  try{
   if(source?.cause!==EntityDamageCause.entityAttack)return false;
   const held=source.damagingEntity?.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Mainhand)?.typeId;
   if(!held||!(axes.has(held)||/^minecraft:[a-z_]+_axe$/.test(held)))return false;
   disabled.set(p.id,t+100);return true;
  }catch{return false;}
 }
 function cooldown(p,t){return Math.max(0,(disabled.get(p?.id)??0)-t);}
 function clear(id){raised.delete(id);disabled.delete(id);}
 return {tick,blocks,equipped,recordBlock,cooldown,clear};
}
