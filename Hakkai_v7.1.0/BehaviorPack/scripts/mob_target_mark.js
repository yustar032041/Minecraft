// Short-lived visual tracking mark, not Java's through-wall Glowing effect.
// Player IDs only; never retain entity references between ticks. One bounded
// record per marked player even when several creatures hit simultaneously.
export function createMobTargetMarks(){
 const marks=new Map(),MAX_MARKED_PLAYERS=128;let lastPrune=-1;
 function mark(source,target,t,duration,realm){
  try{
   if(!Number.isFinite(t)||!Number.isInteger(duration)||duration<=0||!target?.isValid||
      target.typeId!=='minecraft:player'||typeof target.id!=='string'||!target.id||
      !source?.isValid||!source.dimension?.id||target.dimension?.id!==source.dimension.id)return false;
   const id=target.id,dimension=source.dimension.id,old=marks.get(id);
   if(!old&&marks.size>=MAX_MARKED_PLAYERS)return false;
   const expires=Math.max(t+duration,old?.dimension===dimension?old.expires:0);
   marks.set(id,{dimension,expires,realm:Number.isInteger(realm)?Math.max(0,Math.min(7,realm)):0,lastPulse:old?.dimension===dimension?old.lastPulse:undefined});
   return true;
  }catch{return false;}
 }
 function tick(player,t){
  // A stale/disconnected player never causes lookups or stops other players.
  // Also expire old records when any player is ticking; leave/death explicitly
  // remove records, and all state is ephemeral across server restarts.
  if(Number.isFinite(t)&&t%200===0&&t!==lastPrune){lastPrune=t;for(const [id,m] of marks)if(t>=m.expires)marks.delete(id);}
  try{
   const id=player?.id,m=marks.get(id);if(!m)return;
   if(!player.isValid||t>=m.expires||player.dimension.id!==m.dimension){marks.delete(id);return;}
   if(!Number.isFinite(t)||m.lastPulse!==undefined&&t-m.lastPulse<10)return;
   const p=player.location;if(!p||![p.x,p.y,p.z].every(Number.isFinite))return;
   m.lastPulse=t;
   const a=(t%40)*Math.PI/20;
   // Two existing single-particle emitters per pulse, visible normally only;
   // no entity outline, guaranteed tracking through walls, or light emission.
   for(const [angle,id] of [[a,'hakkai:mob_time'],[a+Math.PI,`hakkai:climate_${m.realm}`]])try{
    player.dimension.spawnParticle(id,{x:p.x+Math.cos(angle)*.35,y:p.y+1.45,z:p.z+Math.sin(angle)*.35});
   }catch{}
  }catch{}
 }
 function clear(id){marks.delete(id);}
 return {mark,tick,clear};
}
