// A simple speed aid, not the combat roll or invulnerability. Consume only
// the selected stack, restoring it if the effect API rejects the application.
export function useDodgeScroll(p,creative=false){
 let container,slot,original,consumed=false;
 try{
  if(!p?.isValid)return 'invalid';
  container=p.getComponent('minecraft:inventory')?.container;slot=p.selectedSlotIndex;
  const item=container?.getItem(slot);
  if(item?.typeId!=='hakkai:dodge_scroll'||item.amount<1)return 'changed';
  const effect=p.getEffect('speed');
  if(effect&&(effect.amplifier>0||(effect.amplifier===0&&effect.duration>=160)))return 'already';
  if(!creative){
   original=item.clone();
   let remaining;
   if(item.amount>1){remaining=item.clone();remaining.amount=item.amount-1;}
   consumed=true;container.setItem(slot,remaining);
  }
  p.addEffect('speed',160,{amplifier:0,showParticles:true});
  return 'used';
 }catch{
  if(consumed)try{container.setItem(slot,original);}catch{return 'restore_failed';}
  return 'failed';
 }
}
