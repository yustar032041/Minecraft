// The existing boss summons into a large reserved 5x5x10 empty volume. Only
// known full-block terrain or simple building floors are accepted: non-air is
// not a substitute for collision, and Block.isSolid is preview-only in the
// declared stable API. Unknown blocks, liquids and waterlogging fail closed.
const FLOOR=new Set([
 'minecraft:stone','minecraft:andesite','minecraft:deepslate','minecraft:tuff','minecraft:gravel',
 'minecraft:dirt','minecraft:grass_block','minecraft:moss_block','minecraft:cut_copper',
 'minecraft:copper_block','minecraft:oxidized_copper','minecraft:amethyst_block',
 'minecraft:stone_bricks','minecraft:oak_planks',
 'hakkai:clockstone','hakkai:brasswork','hakkai:timeglass','hakkai:ruin_clockstone'
]);
export function clearColossusSpawnGround(d,x,y,z){
 if(!d||![x,y,z].every(Number.isSafeInteger))return false;
 try{
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
   const at={x:x+dx,y:y-1,z:z+dz};
   if(!d.isChunkLoaded(at))return false;
   const floor=d.getBlock(at);
   if(!floor||!FLOOR.has(floor.typeId)||floor.isAir!==false||floor.isLiquid!==false||floor.isWaterlogged!==false)return false;
   for(let dy=0;dy<=9;dy++)if(d.getBlock({x:at.x,y:y+dy,z:at.z})?.isAir!==true)return false;
  }
  return true;
 }catch{return false;}
}
