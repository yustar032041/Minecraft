// Consume exactly one item from the selected slot, not another stack with the
// same identifier. An exception may occur after a native mutation, so snapshot
// before writing and attempt restoration even when setItem itself throws.
// Effect APIs and restoration are not atomic; an effect may have applied
// before throwing and restoration itself or server shutdown can still fail.
export function useSelectedConsumable(player,id,creative,apply=()=>true){
 let container,slot,original,writeAttempted=false;
 try{
  if(!player?.isValid||typeof apply!=='function')return 'invalid';
  container=player.getComponent('minecraft:inventory')?.container;
  slot=player.selectedSlotIndex;
  if(!container||!Number.isInteger(slot)||slot<0||slot>=container.size)return 'changed';
  const item=container.getItem(slot);
  if(item?.typeId!==id||!Number.isInteger(item.amount)||item.amount<1)return 'changed';
  if(!creative){
   original=item.clone();
   let rest;
   if(item.amount>1){rest=item.clone();rest.amount=item.amount-1;}
   writeAttempted=true;
   container.setItem(slot,rest);
  }
  if(apply()!==true)throw Error('effect rejected');
  return 'used';
 }catch{
  if(writeAttempted)try{container.setItem(slot,original);}catch{return 'restore_failed';}
  return 'failed';
 }
}
