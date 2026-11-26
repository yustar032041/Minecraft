// Damage-source attribution for reactive mobs. A projectile may expose only
// its owner, not damagingEntity. Never guess from nearby players or credit a
// non-player owner; unavailable/invalid components leave the mob neutral.
export function combatPlayerAttacker(source){
 try{
  const direct=source?.damagingEntity;
  if(direct?.isValid&&direct.typeId==='minecraft:player')return direct;
 }catch{}
 try{
  const owner=source?.damagingProjectile?.getComponent('minecraft:projectile')?.owner;
  if(owner?.isValid&&owner.typeId==='minecraft:player')return owner;
 }catch{}
 return undefined;
}
