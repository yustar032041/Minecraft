// Only the selected scroll is consumed. If effect application fails, attempt
// to restore its exact original stack. Creative users keep their scroll.
export function useDefenseScroll(p,creative=false){
 let container,slot,original,consumed=false;
 try{
  if(!p?.isValid)return 'invalid';
  container=p.getComponent('minecraft:inventory')?.container;slot=p.selectedSlotIndex;
  const item=container?.getItem(slot);
  if(item?.typeId!=='hakkai:taunt_scroll'||item.amount<1)return 'changed';
  const effect=p.getEffect('resistance');
  if(effect&&(effect.amplifier>0||(effect.amplifier===0&&effect.duration>=160)))return 'already';
  if(!creative){original=item.clone();let remaining;if(item.amount>1){remaining=item.clone();remaining.amount=item.amount-1;}consumed=true;container.setItem(slot,remaining);}
  p.addEffect('resistance',160,{amplifier:0,showParticles:true});
  return 'used';
 }catch{
  if(consumed)try{container.setItem(slot,original);}catch{return 'restore_failed';}
  return 'failed';
 }
}
// Cooldown is per player session, not per stack. It starts only after success.
// It resets on disconnect/reload; it is deliberately not a persistent penalty.
export function useWarHorn(p,cd,tick){
 try{
  if(!p?.isValid)return 'invalid';
  if(p.getComponent('minecraft:inventory')?.container?.getItem(p.selectedSlotIndex)?.typeId!=='hakkai:war_horn')return 'changed';
  if(!cd||!Number.isFinite(tick))return 'failed';
  const ready=cd.get('war_horn');if(typeof ready==='number'&&tick<ready)return 'cooldown';
  const effect=p.getEffect('strength');
  if(effect&&(effect.amplifier>0||(effect.amplifier===0&&effect.duration>=200)))return 'already';
  p.addEffect('strength',200,{amplifier:0,showParticles:true});
  cd.set('war_horn',tick+400);return 'used';
 }catch{return 'failed';}
}
// One-time keepsakes remain intact. Cooldowns are per player and per keepsake;
// they reset on reconnect, like the existing horn cooldown.
const KEEPSAKES=Object.freeze({
 'hakkai:village_badge':{effect:'resistance',duration:160,cooldown:1200},
 'hakkai:wind_legacy_memorial':{effect:'night_vision',duration:1200,cooldown:2400}
});
export function useKeepsake(p,id,cd,tick){
 try{
  if(!p?.isValid)return 'invalid';
  const spec=KEEPSAKES[id];if(!spec||!cd||!Number.isFinite(tick))return 'failed';
  if(p.getComponent('minecraft:inventory')?.container?.getItem(p.selectedSlotIndex)?.typeId!==id)return 'changed';
  const key=`keepsake:${id}`,ready=cd.get(key);
  if(typeof ready==='number'&&tick<ready)return 'cooldown';
  const current=p.getEffect(spec.effect);
  if(current&&(current.amplifier>0||(current.amplifier===0&&current.duration>=spec.duration)))return 'already';
  p.addEffect(spec.effect,spec.duration,{amplifier:0,showParticles:false});
  cd.set(key,tick+spec.cooldown);return 'used';
 }catch{return 'failed';}
}
