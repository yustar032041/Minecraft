// Server-authoritative visual state and conservative phase-two/final flight trials.
// Entity properties are client-synced; the appearance never decides combat.
function setVisual(e,s,key,value,t){
 const sent=key==='hakkai:form'?'sentForm':'sentFlight',retry=key==='hakkai:form'?'formRetry':'flightRetry';
 if(s[sent]===value||t<(s[retry]??0))return;
 try{e.setProperty(key,value);s[sent]=value;}catch{s[retry]=t+20;}
}
function clearLevitation(e){try{e.removeEffect('levitation');}catch{}}
export function cancelWardenFlight(e,s,t){
 if(s.takeoffAt!==undefined&&!s.flightAborted){clearLevitation(e);s.flightAborted=true;}
 s.nextFlight=Math.max(s.nextFlight??0,t+120);
}
function safeTakeoff(e){
 try{
  const l=e.location,d=e.dimension;
  // Keep this trial away from the walls, ceiling and other players.
  if(l.y<79.8||l.y>81||Math.abs(l.x)>12||Math.abs(l.z)>12)return false;
  if(d.getPlayers({location:l,maxDistance:9}).some(p=>p.isValid&&Math.abs(p.location.x-l.x)<1.5&&Math.abs(p.location.z-l.z)<1.5&&p.location.y>=l.y-1&&p.location.y<=l.y+7))return false;
  for(let x=Math.floor(l.x-.6);x<=Math.floor(l.x+.6);x++)
   for(let z=Math.floor(l.z-.6);z<=Math.floor(l.z+.6);z++)for(let dy=1;dy<=6;dy++){
    const at={x,y:Math.floor(l.y)+dy,z};
    if(!d.isChunkLoaded(at)||!d.getBlock(at)?.isAir)return false;
   }
  return true;
 }catch{return false;}
}
// True blocks new warnings. Both flying forms may attack while low in the air. If it climbs too high, caller cancels any
// warning/front that began in flight, keeping a close counter reachable.
export function updateWardenAppearance(e,s,phase,t,{idle=false,peaceful=false,controlledFlight=false}={}){
 setVisual(e,s,'hakkai:form',phase,t);
 if(controlledFlight){setVisual(e,s,'hakkai:flying',true,t);return true;}
 let grounded;try{grounded=e.isOnGround;}catch{}
 if(typeof grounded==='boolean')setVisual(e,s,'hakkai:flying',!grounded,t);
 if(s.nextFlight===undefined)s.nextFlight=t+100;
 // A timeout or oversized ascent is not permission to fire from out of reach.
 if(s.flightUnsafe&&s.takeoffAt===undefined){if(grounded!==true)return true;s.flightUnsafe=false;}
 if(s.takeoffAt!==undefined){
  if(phase!==s.takeoffPhase||peaceful||t<(s.stopHealUntil??0))cancelWardenFlight(e,s,t);
  const elapsed=t-s.takeoffAt;
  let altitude;try{altitude=e.location.y-s.takeoffY;}catch{}
  // High flight is allowed for movement, but attacks launched in flight are
  // cancelled above close-counter height. Cap ascent before the arena ceiling.
  if(Number.isFinite(altitude)){
   s.flightUnsafe=altitude>2.2;
   if(altitude>5.5)cancelWardenFlight(e,s,t);
  }
  if((elapsed>=15&&grounded===true)||elapsed>=180){
   clearLevitation(e);s.takeoffAt=undefined;s.takeoffPhase=undefined;s.flightAborted=false;s.flightUnsafe=grounded!==true||(Number.isFinite(altitude)&&altitude>2.2);
   s.nextFlight=Math.max(s.nextFlight??0,t+(phase===4?90:120));
   if(s.flightUnsafe)return true;
  }else {
   // Attack only after real takeoff and within reach of ground-level players.
   const canAttack=(phase===1||phase===4)&&s.takeoffPhase===phase&&s.sentForm===phase&&s.sentFlight===true&&!s.flightAborted&&!s.flightUnsafe&&grounded===false&&elapsed>=12&&Number.isFinite(altitude)&&altitude>=.15&&altitude<=1.8;
   return !canAttack;
  }
 }
 if((phase!==1&&phase!==4)||peaceful||!idle||grounded!==true||s.sentForm!==phase||s.sentFlight!==false||t<s.nextFlight||t<(s.stopHealUntil??0))return false;
 s.nextFlight=t+(phase===4?90:120);
 if(!safeTakeoff(e))return false;
 // Slow falling softens the landing; if either API is unsupported do not
 // start an unsafely tracked flight. No world blocks are changed.
 try{e.addEffect('slow_falling',140,{amplifier:0,showParticles:false});}catch{return false;}
 try{e.addEffect('levitation',phase===4?28:35,{amplifier:0,showParticles:false});}catch{try{e.removeEffect('slow_falling');}catch{}return false;}
 s.takeoffAt=t;s.takeoffPhase=phase;s.takeoffY=e.location.y;s.flightUnsafe=false;s.flightAborted=false;
 return true;
}
