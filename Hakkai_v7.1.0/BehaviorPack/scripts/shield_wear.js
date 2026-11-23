// Deferred shield wear: never write to inventory in a before-event. A unique
// per-item token and original slot check reduce the risk of charging a substitute.
// Copies made with commands or creative tools may share a token.
// If the item moves or the player unloads before the callback, wear is skipped.
import {EquipmentSlot,GameMode} from '@minecraft/server';
const TOKEN='hakkai:shield_identity';
export function setupShieldWear({system}){
 let serial=0;const pending=new Map();
 function equipment(p){return p.getComponent('minecraft:equippable');}
 function current(p,slot,index){
  if(slot===EquipmentSlot.Mainhand&&p.selectedSlotIndex!==index)return;
  return equipment(p)?.getEquipment(slot);
 }
 function prepare(p,shield){
  try{
   if(p.getGameMode()===GameMode.Creative)return true;
   const eq=equipment(p),item=eq?.getEquipment(shield.slot);if(item?.typeId!==shield.typeId)return false;
   if(typeof item.getDynamicProperty(TOKEN)==='string')return true;
   const value=`${p.id}:${system.currentTick}:${++serial}:${Math.random().toString(36).slice(2)}`;
   item.setDynamicProperty(TOKEN,value);
   return eq.setEquipment(shield.slot,item)===true;
  }catch{return false;}
 }
 function reserve(p,shield,damage){
  try{
   if(p.getGameMode()===GameMode.Creative)return true;
   if(!Number.isFinite(damage)||damage<=0)return false;
   const slot=shield.slot,index=p.selectedSlotIndex,item=current(p,slot,index),token=item?.getDynamicProperty(TOKEN);
   if(!item||item.typeId!==shield.typeId||typeof token!=='string')return false;
   const durability=item.getComponent('minecraft:durability');
   if(!durability||!Number.isFinite(durability.damage)||!Number.isFinite(durability.maxDurability))return false;
   if(durability.unbreakable)return true;
   const key=p.id+'|'+token,already=pending.get(key)??0;
   if(durability.damage+already>=durability.maxDurability)return false;
   const cost=damage<3?0:1+Math.floor(damage);if(!cost)return true;
   pending.set(key,already+cost);
   try{system.run(()=>{
    try{
     if(!p.isValid)return;
     const eq=equipment(p),now=current(p,slot,index);
     if(!now||now.typeId!==shield.typeId||now.getDynamicProperty(TOKEN)!==token)return;
     const d=now.getComponent('minecraft:durability');if(!d||d.unbreakable)return;
     if(d.damage+cost>=d.maxDurability){if(eq.setEquipment(slot,undefined))try{p.playSound('random.break');}catch{}}
     else{d.damage+=cost;eq.setEquipment(slot,now);}
    }catch{}finally{const left=(pending.get(key)??0)-cost;if(left>0)pending.set(key,left);else pending.delete(key);}
   });}catch{if(already)pending.set(key,already);else pending.delete(key);return false;}
   return true;
  }catch{return false;}
 }
 return {prepare,reserve};
}
