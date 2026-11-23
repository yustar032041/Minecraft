// Short, bounded steering impulses in the arena only. No blocks or players
// are moved. If geometry/API checks fail, the boss stays where it is.
export function steerWarden(e,s,phase,t,{idle=true,peaceful=false}={}){
 if(!idle||peaceful||t<(s.stopHealUntil??0)||t<(s.nextMove??0))return false;
 try{
  const d=e.dimension,l=e.location,grounded=e.isOnGround;
  const flying=!grounded&&(phase===1||phase===4)&&s.takeoffAt!==undefined&&!s.flightAborted;
  if(!grounded&&!flying)return false;
  s.nextMove=t+(flying?6:12);
  const v=e.getVelocity();if(![l.x,l.y,l.z,v.x,v.z].every(Number.isFinite)||Math.hypot(v.x,v.z)>.32)return false;
  const players=d.getPlayers({location:l,maxDistance:45}).filter(p=>p.isValid&&p.typeId==='minecraft:player');
  if(!players.length)return false;
  players.sort((a,b)=>Math.hypot(a.location.x-l.x,a.location.z-l.z)-Math.hypot(b.location.x-l.x,b.location.z-l.z));
  const target=players[0].location;
  // Orbit and occasionally close distance; cycle all directions if obstructed.
  const toward=Math.atan2(target.z-l.z,target.x-l.x),seq=s.moveIndex??0;s.moveIndex=seq+1;
  const distance=Math.hypot(target.x-l.x,target.z-l.z),base=distance>9?toward:toward+(seq%2?1:-1)*Math.PI/2;
  for(let i=0;i<8;i++){
   const a=base+i*Math.PI/4,dx=Math.cos(a),dz=Math.sin(a),end={x:l.x+dx*1.4,y:l.y,z:l.z+dz*1.4};
   if(Math.abs(end.x)>12.5||Math.abs(end.z)>12.5||end.y<79.5||end.y>86)continue;
   if(players.some(p=>Math.abs(p.location.y-end.y)<3&&Math.hypot(p.location.x-end.x,p.location.z-end.z)<2.2))continue;
   let clear=true;
   for(let step=0;step<=1.4&&clear;step+=.35)for(const ox of [-.5,0,.5])for(const oz of [-.5,0,.5]){
    const x=Math.floor(l.x+dx*step+ox),z=Math.floor(l.z+dz*step+oz),y=Math.floor(l.y);
    if(!flying){const floor={x,y:y-1,z};const b=d.getBlock(floor);if(!d.isChunkLoaded(floor)||!b?.isSolid||b.isLiquid||/magma|cactus|campfire|powder_snow/.test(b.typeId)){clear=false;break;}}
    for(let dy=0;dy<=2;dy++){const at={x,y:y+dy,z};if(!d.isChunkLoaded(at)||!d.getBlock(at)?.isAir){clear=false;break;}}
   }
   if(!clear)continue;
   const speed=flying?.12:.09;e.applyImpulse({x:dx*speed,y:0,z:dz*speed});return true;
  }
 }catch{}
 return false;
}
