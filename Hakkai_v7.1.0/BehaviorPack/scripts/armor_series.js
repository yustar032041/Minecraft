import {EquipmentSlot} from '@minecraft/server';
// All four pieces must be worn in their matching slots.
export function equippedSeries(p,ids){
 try{
  if(!Array.isArray(ids)||ids.length!==4)return {equipped:0,active:false};
  const eq=p.getComponent('minecraft:equippable');if(!eq)return {equipped:0,active:false};
  const slots=[EquipmentSlot.Chest,EquipmentSlot.Head,EquipmentSlot.Feet,EquipmentSlot.Legs];
  const matches=ids.map((id,i)=>eq.getEquipment(slots[i])?.typeId===`hakkai:${id}`),equipped=matches.filter(Boolean).length;
  return {equipped,active:matches.every(Boolean)};
 }catch{return {equipped:0,active:false};}
}
// Reserve a dedicated slot for the unstackable armor before assessing emeralds.
export function trialRewardSlot(container,emerald){
 let slot=-1;for(let i=0;i<container.size;i++)if(!container.getItem(i)){slot=i;break;}
 if(slot<0)return -1;
 let capacity=0;for(let i=0;i<container.size;i++){
  if(i===slot)continue;const item=container.getItem(i);
  if(!item)capacity+=emerald.maxAmount;
  else if(item.isStackableWith(emerald))capacity+=item.maxAmount-item.amount;
 }
 return capacity>=emerald.amount?slot:-1;
}
// Legs follow only the chest's existing in-catalog evolution chain. A later
// chest without a matching four-piece series is intentionally terminal.
const LEG_NAMES=['霧銀装 I','深影装 I','紅蓮装 I','大地装 I','雷光装 I','霧銀装 II','深影装 II','紅蓮装 II','大地装 II','雷光装 II','霧銀装 III'];
export function seriesLegUpgrade(id,catalog){
 const match=/^series_leggings_(\d\d)$/.exec(id??'');if(!match)return undefined;
 const i=Number(match[1]);if(i>=LEG_NAMES.length)return undefined;
 const current={id,label:LEG_NAMES[i]+'のレギンス'};
 const chest=catalog.find(g=>g.id===`gear_${String(10+16*i).padStart(3,'0')}`);
 const target=catalog.find(g=>g.prev===chest?.id);
 const j=target?LEG_NAMES.findIndex((_,n)=>target.id===`gear_${String(10+16*n).padStart(3,'0')}`):-1;
 if(j<0)return {current,next:undefined};
 return {current,next:{id:`series_leggings_${String(j).padStart(2,'0')}`,label:LEG_NAMES[j]+'のレギンス',a:target.a,modifier:target.modifier,rank:target.rank}};
}
