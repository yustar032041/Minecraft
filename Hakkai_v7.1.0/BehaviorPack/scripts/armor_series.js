import {EquipmentSlot} from '@minecraft/server';
// The cloak remains an optional compatibility route for existing players;
// the new four-slot outfit does not require possessing it.
export function legacyMantle(leggings){
 const match=/^series_leggings_(\d\d)$/.exec(leggings??'');if(!match)return undefined;
 const i=Number(match[1]);return i<11?`gear_${String(13+16*i).padStart(3,'0')}`:undefined;
}
export function equippedSeries(p,ids,owns){
 try{
  const eq=p.getComponent('minecraft:equippable');if(!eq)return {equipped:0,mantle:false,active:false};
  const slots=[EquipmentSlot.Chest,EquipmentSlot.Head,EquipmentSlot.Feet,EquipmentSlot.Legs];
  const matches=ids.map((id,i)=>eq.getEquipment(slots[i])?.typeId===`hakkai:${id}`),equipped=matches.filter(Boolean).length;
  const mantle=legacyMantle(ids[3]);const legacy=matches.slice(0,3).every(Boolean)&&!!mantle&&owns(mantle);
  return {equipped,mantle:legacy,active:matches.every(Boolean)||legacy};
 }catch{return {equipped:0,mantle:false,active:false};}
}
// Collection/trial completion accepts old cloaks, preserving existing saves.
export function ownsSeriesPiece(id,owns){
 if(owns(id))return true;const mantle=legacyMantle(id);return !!mantle&&owns(mantle);
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
const LEG_NAMES=['霧銀の旅装','深影の黒曜甲','紅蓮の守護装','大地の古代装','雷光の紫電装','星輝の白銀装','夢幻の藤霞装','翠風の森装','蒼海の潮騎装','天空の白翼装','時環の覇者装'];
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
