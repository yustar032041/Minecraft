// Attempt to reflect the existing arrow only, deferred beyond the restricted before-hurt
// event. Never create a replacement or duplicate the shooter's projectile.
export function deferShieldArrow({system,player,source}){
 try{
  const arrow=source?.damagingProjectile;
  if(source?.cause!=='projectile'||!arrow?.isValid||arrow.typeId!=='minecraft:arrow'||arrow.dimension.id!==player.dimension.id)return false;
  const v=arrow.getVelocity(),speed=Math.hypot(v.x,v.y,v.z);
  if(!Number.isFinite(speed)||speed<.05||speed>20)return false;
  const at={...player.location},dimension=player.dimension.id;
  system.run(()=>{
   try{
    if(!player.isValid||!arrow.isValid||player.dimension.id!==dimension||arrow.dimension.id!==dimension)return;
    if(Math.hypot(arrow.location.x-at.x,arrow.location.y-at.y,arrow.location.z-at.z)>4)return;
    const component=arrow.getComponent('minecraft:projectile');if(!component)return;
    component.owner=player;
    arrow.clearVelocity();component.shoot({x:-v.x*.5,y:Math.max(.08,-v.y*.5),z:-v.z*.5});
   }catch{}
  });return true;
 }catch{return false;}
}
