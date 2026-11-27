// Limited scripted enchantment support for replacement melee damage. This is
// not full native melee parity: magic damage, durability, fire, looting, mob
// effects and other native enchantment hooks remain different/unimplemented.
function level(component,id){
 try{const value=component?.getEnchantment(id)?.level;return Number.isInteger(value)?Math.max(0,Math.min(5,value)):0;}catch{return 0;}
}
export function actionEnchantmentBonus(item,target){
 try{
  const enchants=item?.getComponent?.('minecraft:enchantable');if(!enchants)return 0;
  const sharp=level(enchants,'sharpness'),smite=level(enchants,'smite'),bane=level(enchants,'bane_of_arthropods');
  let undead=false,arthropod=false;
  try{const family=target.getComponent('minecraft:type_family');undead=family?.hasTypeFamily('undead')===true;arthropod=family?.hasTypeFamily('arthropod')===true;}catch{}
  // Mutually exclusive in normal enchanting. For command-made combinations,
  // only the strongest eligible enchantment applies, avoiding stacked exploits.
  return Math.max(sharp*1.25,undead?smite*2.5:0,arthropod?bane*2.5:0);
 }catch{return 0;}
}
