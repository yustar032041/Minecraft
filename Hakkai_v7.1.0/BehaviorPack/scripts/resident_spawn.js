// Independent identity for unique sites and seed-generated copies. Copies must
// never write the original site's discovery, resident, or construction keys.
export const villageIdentity=site=>site?.repeatKey??site?.id;
export const villageBuilt=(site,world,num)=>!!site&&num(world,site.repeatKey??`built_${site.id}`)===1;
export function residentSpot(d,point,findFloor){
 // The first candidate can be blocked by a person, a bed, or a machine.
 // Try bounded alternatives rather than permanently stalling the first slot.
 for(const [x,z] of [[0,0],[5,0],[-5,0],[0,5],[0,-5],[7,7],[-7,7],[7,-7],[-7,-7]]){
  const at=findFloor(d,{x:point.x+x,y:point.y,z:point.z+z},3);if(!at)continue;
  if(d.getPlayers({location:at,maxDistance:2,closest:1}).length)continue;
  if(d.getEntities({location:at,maxDistance:1.5,closest:1}).length)continue;
  return at;
 }
}
