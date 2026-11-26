// A refresh is a submission, not proof the engine displayed/applied an effect.
// An unreadable current effect fails closed rather than replacing something
// whose strength or duration we could not determine. Never remove effects.
export function refreshArmorEffect(player,id,duration,amplifier){
 try{
  const current=player.getEffect(id);
  if(current){
   const level=current.amplifier,time=current.duration;
   if(!Number.isFinite(level)||!Number.isFinite(time)||time<0)return false;
   if(level>amplifier||(level===amplifier&&time>=duration))return false;
  }
  player.addEffect(id,duration,{amplifier,showParticles:false});
  return true;
 }catch{return false;}
}
