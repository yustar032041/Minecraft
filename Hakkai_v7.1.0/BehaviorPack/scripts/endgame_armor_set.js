import {refreshArmorEffect} from './armor_effect_refresh.js';
import {EquipmentSlot} from '@minecraft/server';
export const ENDGAME_ARMOR_SETS=[
 Object.freeze({key:'nightwalker',name:'夜渡り装',chests:['hakkai:gear_186','hakkai:gear_187'],bonus:'speed',bonusName:'移動速度上昇'}),
 Object.freeze({key:'united',name:'八界統合装',chests:['hakkai:gear_212','hakkai:gear_213'],bonus:'night_vision',bonusName:'暗視'})
];
export function endgameArmorStatus(p,i){
 try{
  const def=ENDGAME_ARMOR_SETS[i],eq=p.getComponent('minecraft:equippable');if(!def||!eq)return {active:false};
  const chest=eq.getEquipment(EquipmentSlot.Chest)?.typeId;
  return {chest,active:def.chests.includes(chest)&&[EquipmentSlot.Head,EquipmentSlot.Legs,EquipmentSlot.Feet].every((slot,j)=>eq.getEquipment(slot)?.typeId===`hakkai:${def.key}_armor_${['helmet','leggings','boots'][j]}`)};
 }catch{return {active:false};}
}
// Do not downgrade another source's stronger or sufficiently long effect.
export function applyEndgameArmorBonus(p){
 try{
  if(!p?.isValid)return false;
  const chest=p.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Chest)?.typeId;
  const i=ENDGAME_ARMOR_SETS.findIndex(def=>def.chests.includes(chest));
  if(i<0||!endgameArmorStatus(p,i).active)return false;
  const def=ENDGAME_ARMOR_SETS[i];
  return refreshArmorEffect(p,def.bonus,150,0);
 }catch{return false;}
}
