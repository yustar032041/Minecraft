// One world-wide setting. Read it at the time of impact, including delayed
// projectiles, so switching protection back on also protects against old shots.
const KEY='hakkai:friendly_fire';
let worldRef;
export function configureFriendlyFire(world){worldRef=world;}
export function friendlyFireEnabled(){
 try{return worldRef?.getDynamicProperty(KEY)===1;}catch{return false;}
}
export function setFriendlyFire(enabled){
 try{if(!worldRef)return false;worldRef.setDynamicProperty(KEY,enabled?1:0);return worldRef.getDynamicProperty(KEY)===(enabled?1:0);}catch{return false;}
}
export function isPlayerOpponent(attacker,target){
 if(attacker?.typeId!=='minecraft:player'||target?.typeId!=='minecraft:player'||!attacker.id||!target.id||attacker.id===target.id)return false;
 try{return target.isValid&&target.dimension.id===attacker.dimension.id&&friendlyFireEnabled()&&!['creative','spectator'].includes(target.getGameMode());}catch{return false;}
}
// Damage source may identify the shooter directly or via the projectile owner.
export function playerAttacker(source){
 try{if(source?.damagingEntity?.typeId==='minecraft:player')return source.damagingEntity;}catch{}
 try{const owner=source?.damagingProjectile?.getComponent('minecraft:projectile')?.owner;if(owner?.typeId==='minecraft:player')return owner;}catch{}
 try{const owner=source?.damagingEntity?.getComponent('minecraft:projectile')?.owner;if(owner?.typeId==='minecraft:player')return owner;}catch{}
}
export function protectsPlayer(victim,source){
 if(victim?.typeId!=='minecraft:player'||friendlyFireEnabled())return false;
 const attacker=playerAttacker(source);
 return !!attacker&&attacker.id!==victim.id;
}
