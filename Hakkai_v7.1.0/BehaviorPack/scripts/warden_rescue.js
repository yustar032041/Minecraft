import {validWardenArenaFloor} from './warden_arena_floor.js';
// Best effort rescue, only while the boss is loaded and ticked. No blocks are
// changed and a blocked or occupied destination is never forced.
export function isOutsideWardenArena(e){
 try{const l=e.location;return Math.abs(l.x)>15.5||Math.abs(l.z)>15.5||l.y<76||l.y>95;}catch{return true;}
}
export function rescueWarden(e){
 try{
  if(!isOutsideWardenArena(e))return false;
  const d=e.dimension;
  // The original centre is preferred; alternative floor pads avoid leaving the
  // boss inert when a player occupies that point. Never dig or force a landing.
  const pads=[[.5,-6.5],[-7.5,-6.5],[8.5,-6.5],[-7.5,4.5],[8.5,4.5]];
  for(const [x,z] of pads){
   const centre={x,y:80,z};
   if(d.getPlayers({location:centre,maxDistance:4,closest:1}).length)continue;
   let clear=true;
   for(let dx=-1;dx<=1&&clear;dx++)for(let dz=-1;dz<=1&&clear;dz++){
    for(let dy=-1;dy<=2;dy++){
     const p={x:Math.floor(x)+dx,y:centre.y+dy,z:Math.floor(z)+dz};
     if(!d.isChunkLoaded(p)){clear=false;break;}
     const b=d.getBlock(p);
     if(!b||(dy===-1?!validWardenArenaFloor(b):!b.isAir)){clear=false;break;}
    }
   }
   if(clear)return e.tryTeleport(centre,{checkForBlocks:true})===true;
  }
  return false;
 }catch{return false;}
}
