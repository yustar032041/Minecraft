import {refreshArmorEffect} from './armor_effect_refresh.js';
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
// Full-set buffs supplement the existing recovery and parry effects. Values are
// zero-based amplifiers (2 = level III). Preserve stronger/longer outside buffs;
// removing a piece stops refresh but does not remove someone else's effects.
export const ULTIMATE_BUFFS=Object.freeze([
 Object.freeze({id:'resistance',level:2}),Object.freeze({id:'strength',level:2}),
 Object.freeze({id:'speed',level:1}),Object.freeze({id:'regeneration',level:1}),
 Object.freeze({id:'health_boost',level:2}),Object.freeze({id:'haste',level:1}),
 Object.freeze({id:'fire_resistance',level:0}),Object.freeze({id:'water_breathing',level:0}),
 Object.freeze({id:'night_vision',level:0})
]);
export const ULTIMATE_BUFF_DURATION=150;
export function applyUltimateArmorBonus(p){
 if(!p?.isValid||!hasUltimateArmor(p))return 0;
 let applied=0;
 for(const {id,level} of ULTIMATE_BUFFS)
  if(refreshArmorEffect(p,id,ULTIMATE_BUFF_DURATION,level))applied++; // Submitted calls, not observed effects.
 return applied;
}
