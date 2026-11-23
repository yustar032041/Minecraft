import {EntityDamageCause,EquipmentSlot,GameMode} from '@minecraft/server';
const ID='hakkai:fushi_totem',VANILLA='minecraft:totem_of_undying';
const BYPASS=new Set(['void','selfDestruct','override']);
// Script approximation, not native death protection. Before callbacks are
// read-only: reserve in JS and cancel, then debit in normal execution. If the
// item has vanished or the debit fails, reapply the original damage instead.
export function setupFushiTotem({system,notice}){
 const pending=new Map(),replaying=new Set();
 function consume(p,slot,selectedSlot){
  const equip=p.getComponent('minecraft:equippable');
  if(!equip)return false;
  if(slot===EquipmentSlot.Offhand){
   if(equip.getEquipment(slot)?.typeId!==ID)return false;
   return equip.setEquipment(slot,undefined)===true;
  }
  // The originally selected hotbar slot may no longer be selected.
  const container=p.getComponent('minecraft:inventory')?.container;
  if(!container||container.getItem(selectedSlot)?.typeId!==ID)return false;
  container.setItem(selectedSlot,undefined);return true;
 }
 function replay(p,q){
  if(!p.isValid)return;
  replaying.add(p.id);
  try{p.applyDamage(q.damage,{cause:q.cause});}catch{}
  finally{replaying.delete(p.id);}
 }
 function finish(p,q){
  if(pending.get(p.id)!==q)return;
  try{
   if(!p.isValid||!(p.getComponent('minecraft:health')?.currentValue>0))return;
   let paid=false;try{paid=consume(p,q.slot,q.selectedSlot);}catch{}
   if(!paid){replay(p,q);return;}
   const health=p.getComponent('minecraft:health');
   if(health)try{health.setCurrentValue(1);}catch{}
   try{for(const effect of p.getEffects())try{p.removeEffect(effect.typeId);}catch{}}catch{}
   for(const [effect,duration,amplifier] of [['regeneration',800,1],['fire_resistance',800,0],['absorption',100,1]])
    try{p.addEffect(effect,duration,{amplifier,showParticles:true});}catch{}
   try{p.dimension.spawnParticle('minecraft:totem_particle',{x:p.location.x,y:p.location.y+1,z:p.location.z});}catch{}
   try{p.playSound('random.totem',{volume:1,pitch:1});}catch{}
   try{notice(p,'§dFUSHIのトーテムが命を守った！');}catch{}
  }finally{pending.delete(p.id);}
 }
 function before(e){
  try{
   const p=e.hurtEntity,cause=e.damageSource?.cause;
   if(e.cancel||!p?.isValid||p.typeId!=='minecraft:player'||replaying.has(p.id)||BYPASS.has(cause)||!Number.isFinite(e.damage)||e.damage<=0)return false;
   if(![GameMode.Survival,GameMode.Adventure].includes(p.getGameMode()))return false;
   const hp=p.getComponent('minecraft:health')?.currentValue;
   if(!Number.isFinite(hp)||hp<=0||e.damage<hp)return false;
   if(pending.has(p.id)){e.cancel=true;return true;}
   const equip=p.getComponent('minecraft:equippable');if(!equip)return false;
   const main=equip.getEquipment(EquipmentSlot.Mainhand),off=equip.getEquipment(EquipmentSlot.Offhand);
   // Let a genuine vanilla totem handle the hit when one is held.
   if(main?.typeId===VANILLA||off?.typeId===VANILLA)return false;
   const slot=main?.typeId===ID?EquipmentSlot.Mainhand:off?.typeId===ID?EquipmentSlot.Offhand:undefined;
   if(!slot)return false;
   const q={slot,selectedSlot:p.selectedSlotIndex,damage:e.damage,cause};
   pending.set(p.id,q);
   try{system.run(()=>finish(p,q));}catch{pending.delete(p.id);return false;}
   e.cancel=true;return true;
  }catch{return false;}
 }
 function isReplaying(p){return replaying.has(p?.id);}
 return {before,isReplaying};
}
