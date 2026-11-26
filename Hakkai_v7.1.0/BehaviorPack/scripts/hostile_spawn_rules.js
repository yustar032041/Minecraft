import { BlockVolume } from '@minecraft/server';
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
// Total light includes daylight and cannot isolate torch light. Instead look
// for common placed lights within a small Manhattan radius and unobstructed
// line of sight. This is intentionally an approximation, not the light engine.
const LIGHT_RADIUS={
 'minecraft:torch':7,'minecraft:soul_torch':5,'minecraft:lantern':7,'minecraft:soul_lantern':5,
 'minecraft:sea_lantern':7,'minecraft:glowstone':7,'minecraft:shroomlight':7,
 'minecraft:lit_pumpkin':7,'minecraft:lit_redstone_lamp':7,'minecraft:beacon':7,
 'minecraft:end_rod':6,'minecraft:redstone_torch':3,
 'minecraft:campfire':7,'minecraft:soul_campfire':5,
 'minecraft:ochre_froglight':7,'minecraft:verdant_froglight':7,'minecraft:pearlescent_froglight':7
};
export function nearArtificialLight(d,location){
 const at={x:Math.floor(location.x),y:Math.floor(location.y),z:Math.floor(location.z)},r=7;
 try{
  const volume=new BlockVolume({x:at.x-r,y:at.y-r,z:at.z-r},{x:at.x+r,y:at.y+r,z:at.z+r});
  const matches=d.getBlocks(volume,{includeTypes:Object.keys(LIGHT_RADIUS)},true);
  for(const p of matches.getBlockLocationIterator()){
   const block=d.getBlock(p),radius=LIGHT_RADIUS[block?.typeId];if(!radius)continue;
   const distance=Math.abs(p.x-at.x)+Math.abs(p.y-at.y)+Math.abs(p.z-at.z);
   if(distance>radius)continue;
   if(block.typeId.endsWith('campfire')&&block.permutation?.getState('extinguished')===true)continue;
   const v={x:p.x-at.x,y:p.y-at.y,z:p.z-at.z},len=Math.hypot(v.x,v.y,v.z);
   if(len>.01){
    const hit=d.getBlockFromRay({x:at.x+.5,y:at.y+.5,z:at.z+.5},{x:v.x/len,y:v.y/len,z:v.z/len},{maxDistance:Math.max(.01,len-.51)});
    // A diagonal ray can enter the light block more than half a block before
    // its centre. That is the source itself, not an intervening wall.
    // Unknown hit information remains conservative for this approximation.
    if(hit){
     const h=hit.block?.location;
     if(!h||h.x!==p.x||h.y!==p.y||h.z!==p.z)continue;
    }
   }
   return true;
  }
 }catch{} // Do not suppress spawning when inspection is unavailable.
 return false;
}
export function disallowHostileSpawn(d,at,context){
 return inFactoryVillage(d,at,context)||nearArtificialLight(d,at);
}
export function suppressVanillaSpawn(event,context){
 if(event.cause!=='Spawned')return false;
 const e=event.entity;
 try{
  if(!e?.isValid||!VANILLA_HOSTILES.has(e.typeId))return false;
  if(!disallowHostileSpawn(e.dimension,e.location,context))return false;
  e.remove();return true;
 }catch{return false;}
}
