import {validWardenArenaFloor} from './warden_arena_floor.js';
import {chooseWardenTarget} from './warden_ai.js';
// Bounded steering: sample the entire prospective path and volume before
// applying an impulse. Never teleport or change blocks or other entities.
export function steerWarden(e,s,phase,t,{idle=true,peaceful=false,brain,situation}={}){
 if(!idle||peaceful||t<(s.stopHealUntil??0)||t<(s.nextMove??0))return false;
 try{
  const d=e.dimension,l=e.location,grounded=e.isOnGround;
  const flying=!grounded&&(phase===1||phase===4)&&s.takeoffAt!==undefined&&!s.flightAborted;
  if(!grounded&&!flying)return false;
  s.nextMove=t+(flying?6:12);
  const v=e.getVelocity();if(![l.x,l.y,l.z,v.x,v.y??0,v.z].every(Number.isFinite)||Math.hypot(v.x,v.z)>(flying?.55:.32)||Math.abs(v.y??0)>.5)return false;
  const players=d.getPlayers({location:l,maxDistance:45}).filter(p=>p.isValid&&p.typeId==='minecraft:player');
  if(!players.length)return false;
  players.sort((a,b)=>Math.hypot(a.location.x-l.x,a.location.z-l.z)-Math.hypot(b.location.x-l.x,b.location.z-l.z));
  const chosen=brain&&situation?chooseWardenTarget(brain,situation,{origin:l}):players[0];
  if(!chosen||!players.some(p=>p.id===chosen.id))return false;
  const target=chosen.location,seq=s.moveIndex??0;s.moveIndex=seq+1;
  const toward=Math.atan2(target.z-l.z,target.x-l.x),distance=Math.hypot(target.x-l.x,target.z-l.z);
  const profile=situation?.profiles.find(p=>p.player.id===chosen.id),cross=profile?Math.cos(toward)*profile.vz-Math.sin(toward)*profile.vx:0;
  // Respond to a closing player or their lateral movement; retain the old
  // fallback for callers that have no observation context.
  const base=brain?(distance<3.5&&profile?.approach>.04?toward+Math.PI:distance>9?toward:toward+(cross>=0?-1:1)*Math.PI/2):
   flying?toward+[Math.PI/2,-Math.PI/2,Math.PI,0][seq%4]:distance>9?toward:toward+(seq%2?1:-1)*Math.PI/2;
  for(let i=0;i<8;i++){
   const a=base+i*Math.PI/4,dx=Math.cos(a),dz=Math.sin(a),length=flying?3:1.4;
   let dy=0;
   if(flying){const altitude=l.y-(s.takeoffY??80);dy=altitude>4?-.32:altitude<1?.32:(seq%2?.3:-.3);}
   let clear=true;
   for(let step=0;step<=length+.001&&clear;step+=.35){
    const f=step/length,x=l.x+dx*step+(v.x||0)*f*2,z=l.z+dz*step+(v.z||0)*f*2,y=l.y+dy*step+(v.y||0)*f*2;
    if(Math.abs(x)>12.5||Math.abs(z)>12.5||y<79.8||y>85){clear=false;break;}
    if(players.some(p=>Math.abs(p.location.y-y)<3&&Math.hypot(p.location.x-x,p.location.z-z)<2.2)){clear=false;break;}
    for(const ox of [-.5,0,.5])for(const oz of [-.5,0,.5]){
     const bx=Math.floor(x+ox),bz=Math.floor(z+oz),by=Math.floor(y);
     if(!flying){const floor={x:bx,y:by-1,z:bz};if(!d.isChunkLoaded(floor)||!validWardenArenaFloor(d.getBlock(floor))){clear=false;break;}}
     for(let h=0;h<=2;h++){const at={x:bx,y:by+h,z:bz};if(!d.isChunkLoaded(at)||!d.getBlock(at)?.isAir){clear=false;break;}}
    }
   }
   if(!clear)continue;
   const speed=flying?.23:.09;e.applyImpulse({x:dx*speed,y:flying?dy*.42:0,z:dz*speed});return true;
  }
 }catch{}
 return false;
}
