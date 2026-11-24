import { inSite } from './natural_sites.js';

// Only mobs whose normal behaviour is hostile. Neutral animals, bosses and
// other add-ons' entities are deliberately not classified by family alone.
export const VANILLA_HOSTILES=new Set([
 'minecraft:zombie','minecraft:zombie_villager','minecraft:zombie_villager_v2',
 'minecraft:husk','minecraft:drowned','minecraft:skeleton','minecraft:stray',
 'minecraft:bogged','minecraft:wither_skeleton','minecraft:creeper',
 'minecraft:spider','minecraft:cave_spider','minecraft:slime','minecraft:magma_cube',
 'minecraft:phantom','minecraft:silverfish','minecraft:endermite','minecraft:witch',
 'minecraft:blaze','minecraft:ghast','minecraft:shulker','minecraft:breeze',
 'minecraft:guardian','minecraft:hoglin','minecraft:zoglin','minecraft:piglin_brute',
 'minecraft:pillager','minecraft:vindicator','minecraft:evocation_illager',
 'minecraft:ravager','minecraft:vex'
]);

// The full footprint is 97 blocks wide, independent of height. Only already
// placed villages count; do not reserve planned but unbuilt locations.
export function inFactoryVillage(d,at,{factory,world,num,repeatSiteAt}){
 if(d.id!=='hakkai:realm_0')return false;
 const x=Math.floor(at.x),z=Math.floor(at.z);
 if(factory&&num(world,`built_${factory.id}`)===1&&inSite(factory,x,z))return true;
 const repeat=repeatSiteAt?.(0,x,z);
 return repeat?.id===59;
}
export function disallowHostileSpawn(d,at,context){
 if(inFactoryVillage(d,at,context))return true;
 // Failure to read light is not safe for an addon-controlled spawn.
 try{return d.getLightLevel({x:Math.floor(at.x),y:Math.floor(at.y),z:Math.floor(at.z)})>0;}
 catch{return true;}
}
export function suppressVanillaSpawn(event,context){
 if(event.cause!=='Spawned')return false;
 const e=event.entity;
 try{
  if(!e?.isValid||!VANILLA_HOSTILES.has(e.typeId))return false;
  // If light lookup fails outside a village, keep the existing entity rather
  // than accidentally remove an entity in an unloaded/invalid location.
  const inVillage=inFactoryVillage(e.dimension,e.location,context);
  let light=0;
  if(!inVillage)try{light=e.dimension.getLightLevel({x:Math.floor(e.location.x),y:Math.floor(e.location.y),z:Math.floor(e.location.z)});}catch{return false;}
  if(!inVillage&&!(light>0))return false;
  e.remove();return true;
 }catch{return false;}
}
