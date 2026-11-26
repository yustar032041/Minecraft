// Preliminary filter only: callers MUST also use downward collision rays to
// verify the expected top surface. Block.isSolid is not present in the
// declared @minecraft/server 2.11.0 stable type definitions. A non-air block
// is not automatically a solid floor: its shape is checked separately.
export function possibleFloor(block,hazards){
 if(!block||typeof block.typeId!=='string'||!block.typeId||block.isWaterlogged!==false||
    block.isAir===true||block.isLiquid===true||hazards.test(block.typeId))return false;
 if(typeof block.isSolid==='boolean')return block.isSolid;
 // On stable API, insist on known non-air/non-liquid properties before any
 // ray tests. Unknown or unavailable values fail closed.
 return block.isAir===false&&block.isLiquid===false;
}
