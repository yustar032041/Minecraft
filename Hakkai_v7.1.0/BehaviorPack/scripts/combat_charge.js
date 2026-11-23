import {GameMode} from '@minecraft/server';
const MELEE=new Set(['剣','斧','槍']);
// Bedrock input events are authoritative: completing a charge alone never
// attacks. A crouched user must hold for the minimum and release the item.
export function setupCombatCharge({system,gear,selected,state,cast}){
 const draws=new Map();
 function start(p,item){
  if(p?.id)draws.delete(p.id);
  try{
   if(!p?.isValid||!p.isSneaking||p.getGameMode()===GameMode.Spectator||!item?.typeId)return;
   const g=gear.get(item.typeId);if(!g||!(MELEE.has(g.kind)||g.kind==='弓'))return;
   const s=state(p);if(s.busy||s.menu)return;
   draws.set(p.id,{type:item.typeId,kind:g.kind,slot:p.selectedSlotIndex,dim:p.dimension.id,start:system.currentTick});
  }catch{}
 }
 function release(p,item){
  const entry=draws.get(p?.id);if(p?.id)draws.delete(p.id);
  try{
   if(!entry||!p.isValid||!p.isSneaking||p.getGameMode()===GameMode.Spectator||!item?.typeId)return false;
   const t=system.currentTick,g=gear.get(item.typeId),elapsed=t-entry.start;
   if(!g||entry.type!==item.typeId||g.kind!==entry.kind||elapsed<(entry.kind==='弓'?18:24)||elapsed>300||p.dimension.id!==entry.dim||p.selectedSlotIndex!==entry.slot||selected(p)?.typeId!==entry.type)return false;
   const s=state(p);if(s.busy||s.menu||t-s.useTick<7)return false;
   s.useTick=t;cast(p,g,true);return true;
  }catch{return false;}
 }
 function stop(p,item){
  const entry=draws.get(p?.id);if(!entry||item?.typeId&&item.typeId!==entry.type)return;
  // The engine can emit stop before release. Defer cleanup and only clear
  // the same draw, so a subsequent new draw is not accidentally erased.
  try{system.run(()=>{if(draws.get(p.id)===entry)draws.delete(p.id);});}catch{draws.delete(p.id);}
 }
 function complete(p,item){
  // Auto-completing the long use duration is not a release.
  const entry=draws.get(p?.id);
  if(entry&&entry.type===item?.typeId&&MELEE.has(entry.kind)&&system.currentTick-entry.start>=300)draws.delete(p.id);
 }
 function status(p,t){
  try{
   const e=draws.get(p?.id);if(!e||!p.isValid||!p.isSneaking||p.dimension.id!==e.dim||p.selectedSlotIndex!==e.slot||selected(p)?.typeId!==e.type)return '';
   const elapsed=t-e.start;if(elapsed<0||elapsed>=300)return '';
   return elapsed>=(e.kind==='弓'?18:24)?'§a溜め完了：使用ボタンを離す':'§e武器を溜めています';
  }catch{return '';}
 }
 function clear(id){draws.delete(id);}
 return {start,release,stop,complete,status,clear};
}
export const RELEASE_WEAPON_KINDS=MELEE;
