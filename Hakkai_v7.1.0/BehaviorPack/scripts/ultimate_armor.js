import {EquipmentSlot} from '@minecraft/server';
const PIECES=[[EquipmentSlot.Head,'hakkai:ult_helmet'],[EquipmentSlot.Chest,'hakkai:ult_chest'],[EquipmentSlot.Legs,'hakkai:ult_leggings'],[EquipmentSlot.Feet,'hakkai:ult_boots']];
export function hasUltimateArmor(p){
 try{const equipment=p.getComponent('minecraft:equippable');return !!equipment&&PIECES.every(([slot,id])=>equipment.getEquipment(slot)?.typeId===id);}catch{return false;}
}
// Only positive regeneration is boosted: swimming/sprinting drain and guard
// exhaustion still apply exactly as before. Upper/lower caps remain caller's.
export function ultimateRegen(amount,active){return active&&amount>0?amount*1.2:amount;}
export function ultimateParryHeal(p){
 if(!hasUltimateArmor(p))return false;
 try{const h=p.getComponent('minecraft:health');if(!h||!Number.isFinite(h.currentValue)||!Number.isFinite(h.effectiveMax)||h.currentValue<=0||h.currentValue>=h.effectiveMax)return false;h.setCurrentValue(Math.min(h.effectiveMax,h.currentValue+2));return true;}catch{return false;}
}
