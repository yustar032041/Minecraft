import {possibleFloor} from './floor_candidate.js';
// Existing shadow soldiers only, not the future king guardian summon.
// Small mobs must fit inside the unmodified warning and loaded empty blocks.
export const KING_SHADOW_SUMMONS=Object.freeze([
 Object.freeze({type:'foe_7_11',width:.53,height:.8}),
 Object.freeze({type:'foe_6_8',width:.68,height:.98})
]);
// Solid blocks can have partial collision surfaces. Sample centre and corners
// against the expected foot plane. Raycast shapes are not a guarantee of
// Bedrock entity physics, so unknown/missing data refuses the candidate.
function supported(d,pos,width){
 const r=Math.max(0,width/2-.02);
 for(const [dx,dz] of [[0,0],[-r,-r],[-r,r],[r,-r],[r,r]]){
  const origin={x:pos.x+dx,y:pos.y+.04,z:pos.z+dz};
  if(!d.isChunkLoaded(origin)||!d.isChunkLoaded({...origin,y:pos.y-.08}))return false;
  const hit=d.getBlockFromRay(origin,{x:0,y:-1,z:0},{maxDistance:.12,includeLiquidBlocks:false,includePassableBlocks:false});
  if(!hit?.block||!hit.faceLocation||String(hit.face).toLowerCase()!=='up')return false;
  const y=hit.block.location?.y+hit.faceLocation.y;
  if(!Number.isFinite(y)||Math.abs(y-pos.y)>.035)return false;
 }
 return true;
}
export function findKingShadowSpawn(d,aim,angle,shape,reserved=[]){
 if(!d||!aim||![aim.x,aim.y,aim.z,angle,shape?.width,shape?.height].every(Number.isFinite)||shape.width<=0||shape.height<=0)return undefined;
 for(let step=0;step<8;step++){
  const a=angle+step*Math.PI/4;
  const pos={x:aim.x+Math.cos(a)*5,y:Math.floor(aim.y),z:aim.z+Math.sin(a)*5};
  if(reserved.some(p=>Math.hypot(pos.x-p.x,pos.y-p.y,pos.z-p.z)<2))continue;
  try{
   if(d.getEntities({location:pos,maxDistance:2,closest:1}).length)continue;
   const minX=Math.floor(pos.x-shape.width/2),maxX=Math.floor(pos.x+shape.width/2-1e-6);
   const minZ=Math.floor(pos.z-shape.width/2),maxZ=Math.floor(pos.z+shape.width/2-1e-6);
   const maxY=Math.floor(pos.y+shape.height-1e-6);
   let safe=true;
   for(let x=minX;x<=maxX&&safe;x++)for(let z=minZ;z<=maxZ&&safe;z++){
    const floor={x,y:pos.y-1,z};
    if(!d.isChunkLoaded(floor)){safe=false;break;}
    const support=d.getBlock(floor);
    // isLiquid excludes waterlogged blocks; the footprint rays below are
    // essential because a non-air candidate can be only a partial block.
    if(!possibleFloor(support,/(magma|cactus|campfire|leaves|powder_snow|rail|pressure_plate|carpet|fern|vine|dripleaf|pointed_dripstone)/)){safe=false;break;}
    for(let y=pos.y;y<=maxY;y++){
     const at={x,y,z};if(!d.isChunkLoaded(at)||!d.getBlock(at)?.isAir){safe=false;break;}
    }
   }
   if(safe&&supported(d,pos,shape.width))return pos;
  }catch{} // unloaded blocks and unavailable APIs fail closed
 }
 return undefined;
}
