// Resolve an already-recorded target ID only. A stale player reference may
// throw on property access; it must not hide a different online player. An
// unavailable player list or missing target fails closed, never retargets.
export function findCombatPlayer(world,id){
 if(typeof id!=='string'||!id)return undefined;
 try{
  for(const player of world.getAllPlayers())try{if(player?.id===id)return player;}catch{}
 }catch{}
 return undefined;
}
