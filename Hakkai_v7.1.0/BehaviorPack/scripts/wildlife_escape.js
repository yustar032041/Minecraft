import {validWildlifeGround} from './wildlife_ground.js';

// A limited preflight for the eight timid, small wildlife: only try a short
// impulse if its nearby level path has loaded, full supported floor cells and
// two air blocks. Actual impulse physics, external forces and further travel
// are engine controlled; this is not a guarantee against falling.
export function safeWildlifeEscape(entity,player,preferred=0){
 try{
  const d=entity.dimension,a=entity.location,b=player.location;
  if(entity.isOnGround===false||!a||!b||![a.x,a.y,a.z,b.x,b.y,b.z].every(Number.isFinite)||
     !d?.id||player.dimension?.id!==d.id||Math.abs(a.y-Math.round(a.y))>.05)return undefined;
  const dx=a.x-b.x,dz=a.z-b.z,length=Math.hypot(dx,dz);if(length<.01)return undefined;
  const base=Math.atan2(dz,dx),cache=new Map(),y=Math.round(a.y);
  // The two side steps still point away from the player. Cache support checks
  // shared by adjacent candidates; never modify terrain or force chunks in.
  const choices=preferred===1?[Math.PI/3,0,-Math.PI/3]:preferred===-1?[-Math.PI/3,0,Math.PI/3]:[0,Math.PI/3,-Math.PI/3];
  for(const offset of choices){
   const angle=base+offset,x=Math.cos(angle),z=Math.sin(angle);let safe=true;
   for(const step of [.5,1,1.5,2,2.5,3]){
    const bx=Math.floor(a.x+x*step),bz=Math.floor(a.z+z*step),key=`${bx},${bz}`;
    if(!cache.has(key))cache.set(key,validWildlifeGround(d,{x:bx+.5,y,z:bz+.5}));
    if(!cache.get(key)){safe=false;break;}
   }
   if(safe)return {x,z};
  }
 }catch{}
 return undefined;
}
