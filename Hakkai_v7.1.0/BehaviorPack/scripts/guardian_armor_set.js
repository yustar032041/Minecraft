import {refreshArmorEffect} from './armor_effect_refresh.js';
import {EquipmentSlot} from '@minecraft/server';
const NAMES=['翠嵐','霧晶','金砂','氷華','紫電','深翠','天翼','時環'];
const REALMS=['始まりの草原','霧の森','砂の回廊','氷の鏡湖','雷の断崖','地下庭園','空の浮島','時の終着駅'];
// Materials match the existing awakening trial's crystal/shard IDs, even
// where the material's attribute name differs from the place or armor name.
const MATERIALS=['風','水','火','土','雷','光','闇','時'];
const CHEST_EFFECTS=['移動速度上昇','暗視','火炎耐性','耐性','採掘速度上昇','再生能力','低速落下','体力増強'];
const BONUSES=['resistance','speed','resistance','speed','resistance','night_vision','resistance','resistance'];
const BONUS_NAMES=['耐性','移動速度上昇','耐性','移動速度上昇','耐性','暗視','耐性','耐性'];
export const GUARDIAN_ARMOR_SETS=NAMES.map((name,i)=>Object.freeze({index:i,name,realm:REALMS[i],material:MATERIALS[i],chestEffect:CHEST_EFFECTS[i],bonus:BONUSES[i],bonusName:BONUS_NAMES[i],
 chests:[188+i,196+i,204+i].map(n=>`hakkai:gear_${n}`),companions:['helmet','leggings','boots'].map(part=>`guardian_armor_${i}_${part}`)}));
export function guardianArmorStatus(p,i){
 try{
  const def=GUARDIAN_ARMOR_SETS[i],eq=p.getComponent('minecraft:equippable');
  if(!def||!eq)return {active:false,chest:undefined};
  const chest=eq.getEquipment(EquipmentSlot.Chest)?.typeId;
  const active=def.chests.includes(chest)&&[EquipmentSlot.Head,EquipmentSlot.Legs,EquipmentSlot.Feet].every((slot,n)=>eq.getEquipment(slot)?.typeId===`hakkai:${def.companions[n]}`);
  return {active,chest};
 }catch{return {active:false,chest:undefined};}
}
// Only the exact matching four pieces qualify. The additional effect differs
// from the chest's own effect. Never replace a stronger or longer effect.
export function applyGuardianArmorBonus(p){
 try{
  if(!p?.isValid)return false;
  const chest=p.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Chest)?.typeId;
  const def=GUARDIAN_ARMOR_SETS.find(set=>set.chests.includes(chest));
  if(!def||!guardianArmorStatus(p,def.index).active)return false;
  return refreshArmorEffect(p,def.bonus,150,0);
 }catch{return false;}
}
